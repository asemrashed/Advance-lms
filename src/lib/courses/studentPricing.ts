import mongoose from "mongoose";
import ApprovedStudentPricing, {
  type IApprovedStudentPricing,
} from "@/models/ApprovedStudentPricing";
import DiscountRequest from "@/models/DiscountRequest";
import {
  resolveCourseAmountForPlan,
  resolveBatchAmountForPlan,
  type CoursePricingInput,
} from "@/lib/courses/liveCoursePricing";

export type StudentPricingResult = {
  listAmount: number;
  finalAmount: number;
  discountApplied: boolean;
  approvedPricingId?: string;
};

export type StudentCoursePricingState = {
  listAmount: number;
  finalAmount: number;
  hasApprovedDiscount: boolean;
  requestStatus: "none" | "pending" | "approved" | "rejected";
  approvedPricingId?: string;
  requestedAmount?: number;
  approvedAmount?: number;
  rejectionNote?: string;
};

type ApprovedPricingLean = Pick<
  IApprovedStudentPricing,
  "_id" | "approvedAmount" | "listPrice" | "status"
>;

export function resolveAmountWithApprovedPricing(
  listAmount: number,
  approved: ApprovedPricingLean | null | undefined,
): StudentPricingResult {
  if (approved && approved.status === "active") {
    const finalAmount = Math.max(0, Number(approved.approvedAmount) || 0);
    return {
      listAmount,
      finalAmount,
      discountApplied: finalAmount < listAmount,
      approvedPricingId: String(approved._id),
    };
  }
  return {
    listAmount,
    finalAmount: listAmount,
    discountApplied: false,
  };
}

export function resolveAmountForStudentSync(
  course: CoursePricingInput & { monthlyPrice?: number },
  plan: "monthly" | "full",
  approved: ApprovedPricingLean | null | undefined,
): StudentPricingResult {
  const listAmount = resolveCourseAmountForPlan(course, plan);
  return resolveAmountWithApprovedPricing(listAmount, approved);
}

export async function upsertApprovedStudentPricing(params: {
  studentId: string | mongoose.Types.ObjectId;
  courseId: string | mongoose.Types.ObjectId;
  billingPlan: "monthly" | "full";
  approvedAmount: number;
  listPrice: number;
  approvedBy: string | mongoose.Types.ObjectId;
  note?: string;
}): Promise<ApprovedPricingLean> {
  const now = new Date();
  const studentId = new mongoose.Types.ObjectId(String(params.studentId));
  const courseId = new mongoose.Types.ObjectId(String(params.courseId));
  const approvedBy = new mongoose.Types.ObjectId(String(params.approvedBy));
  const approvedAmount = Math.max(0, Number(params.approvedAmount) || 0);
  const listPrice = Math.max(0, Number(params.listPrice) || 0);

  await ApprovedStudentPricing.updateMany(
    {
      studentId,
      courseId,
      billingPlan: params.billingPlan,
      status: "active",
    },
    { $set: { status: "revoked", revokedAt: now } },
  );

  const row = await ApprovedStudentPricing.create({
    studentId,
    courseId,
    billingPlan: params.billingPlan,
    approvedAmount,
    listPrice,
    approvedBy,
    approvedAt: now,
    note: params.note?.trim() || undefined,
    status: "active",
  });

  return {
    _id: row._id,
    approvedAmount: row.approvedAmount,
    listPrice: row.listPrice,
    status: row.status,
  };
}

export async function findActiveApprovedPricing(
  studentId: string | mongoose.Types.ObjectId,
  courseId: string | mongoose.Types.ObjectId,
  billingPlan: "monthly" | "full",
): Promise<ApprovedPricingLean | null> {
  const row = await ApprovedStudentPricing.findOne({
    studentId,
    courseId,
    billingPlan,
    status: "active",
  })
    .select("_id approvedAmount listPrice status")
    .lean();
  return row as ApprovedPricingLean | null;
}

export async function resolveAmountForStudent(
  courseId: string | mongoose.Types.ObjectId,
  course: CoursePricingInput & { monthlyPrice?: number },
  plan: "monthly" | "full",
  studentId: string | mongoose.Types.ObjectId,
  pricingMap?: Map<ApprovedPricingKey, ApprovedPricingLean>,
): Promise<StudentPricingResult> {
  const listAmount = resolveCourseAmountForPlan(course, plan);
  const approved = pricingMap
    ? pricingMap.get(approvedPricingKey(String(courseId), plan)) ?? null
    : await findActiveApprovedPricing(studentId, courseId, plan);
  return resolveAmountWithApprovedPricing(listAmount, approved);
}

export async function getStudentCoursePricingState(
  studentId: string,
  courseId: string,
  billingPlan: "monthly" | "full",
  course: CoursePricingInput & { monthlyPrice?: number },
): Promise<StudentCoursePricingState> {
  const pricing = await resolveAmountForStudent(
    courseId,
    course,
    billingPlan,
    studentId,
  );

  const pending = await DiscountRequest.findOne({
    studentId,
    courseId,
    billingPlan,
    status: "pending",
  })
    .select("requestedAmount")
    .lean();

  if (pending) {
    return {
      listAmount: pricing.listAmount,
      finalAmount: pricing.finalAmount,
      hasApprovedDiscount: pricing.discountApplied,
      requestStatus: "pending",
      requestedAmount: Number(pending.requestedAmount) || 0,
      approvedPricingId: pricing.approvedPricingId,
      approvedAmount: pricing.discountApplied ? pricing.finalAmount : undefined,
    };
  }

  if (pricing.discountApplied) {
    return {
      listAmount: pricing.listAmount,
      finalAmount: pricing.finalAmount,
      hasApprovedDiscount: true,
      requestStatus: "approved",
      approvedPricingId: pricing.approvedPricingId,
      approvedAmount: pricing.finalAmount,
    };
  }

  const rejected = await DiscountRequest.findOne({
    studentId,
    courseId,
    billingPlan,
    status: "rejected",
  })
    .sort({ reviewedAt: -1 })
    .select("rejectionNote requestedAmount")
    .lean();

  if (rejected) {
    return {
      listAmount: pricing.listAmount,
      finalAmount: pricing.finalAmount,
      hasApprovedDiscount: false,
      requestStatus: "rejected",
      requestedAmount: Number(rejected.requestedAmount) || 0,
      rejectionNote: rejected.rejectionNote ? String(rejected.rejectionNote) : undefined,
    };
  }

  return {
    listAmount: pricing.listAmount,
    finalAmount: pricing.finalAmount,
    hasApprovedDiscount: false,
    requestStatus: "none",
  };
}

export type PaymentDiscountMeta = {
  originalAmount?: number;
  discountApplied: boolean;
  approvedPricingId?: mongoose.Types.ObjectId;
};

export function buildPaymentDiscountMeta(
  pricing: StudentPricingResult,
): PaymentDiscountMeta {
  if (!pricing.discountApplied) {
    return { discountApplied: false };
  }
  return {
    originalAmount: pricing.listAmount,
    discountApplied: true,
    approvedPricingId: pricing.approvedPricingId
      ? new mongoose.Types.ObjectId(pricing.approvedPricingId)
      : undefined,
  };
}

export type ApprovedPricingKey = `${string}:${"monthly" | "full"}`;

export function approvedPricingKey(
  courseId: string,
  plan: "monthly" | "full",
): ApprovedPricingKey {
  return `${courseId}:${plan}`;
}

export async function loadActiveApprovedPricingMap(
  studentId: string | mongoose.Types.ObjectId,
): Promise<Map<ApprovedPricingKey, ApprovedPricingLean>> {
  const rows = await ApprovedStudentPricing.find({
    studentId,
    status: "active",
  })
    .select("_id approvedAmount listPrice status courseId billingPlan")
    .lean();

  const map = new Map<ApprovedPricingKey, ApprovedPricingLean>();
  for (const row of rows) {
    const key = approvedPricingKey(String(row.courseId), row.billingPlan as "monthly" | "full");
    map.set(key, row as ApprovedPricingLean);
  }
  return map;
}

export async function resolveBatchAmountForStudent(
  batch: { monthlyFee?: number; courseId?: unknown },
  course: (CoursePricingInput & { monthlyPrice?: number }) | null | undefined,
  plan: "monthly" | "full",
  studentId: string | mongoose.Types.ObjectId,
  pricingMap?: Map<ApprovedPricingKey, ApprovedPricingLean>,
): Promise<StudentPricingResult> {
  const listAmount = resolveBatchAmountForPlan(batch, course ?? null, plan);
  const courseId = batch.courseId ? String(batch.courseId) : "";
  if (!courseId) {
    return { listAmount, finalAmount: listAmount, discountApplied: false };
  }
  const approved = pricingMap
    ? pricingMap.get(approvedPricingKey(courseId, plan)) ?? null
    : await findActiveApprovedPricing(studentId, courseId, plan);
  return resolveAmountWithApprovedPricing(listAmount, approved);
}
