'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppSelector } from "@/store";
import { usePayment } from "./usePayment";
import { createEnrollment, getMyEnrollments } from "@/lib/api/enrollmentClient";
import { isCourseFree } from "@/lib/enrollment/enrollmentUiState";

type CheckoutInput =
  | string
  | {
      courseId?: string;
      courseIds?: string[];
      isPaid?: boolean;
      finalPrice?: number;
    };

export const useCheckout = () => {
  const router = useRouter();
  const authUser = useAppSelector((s) => s?.auth?.user);
  const authLoading = useAppSelector((s) => s?.auth?.isLoading);
  const cartItems = useAppSelector((s) => s.cart.items);
  
  // Use the tools already built into usePayment
  const { initiatePayment, loading } = usePayment();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheckout = async (input?: CheckoutInput) => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      showToast("Loading authentication... please wait", "error");
      return;
    }

    if (!authUser?._id) {
      alert("Please login to checkout");
      router.push("/login");
      return;
    }

    if (authUser?.role !== "student") {
      showToast("Only students can enroll in courses", "error");
      return;
    }

    const explicitCourseId = typeof input === "string" ? input : input?.courseId;
    const explicitCourseIds =
      typeof input === "string" ? [] : (input?.courseIds ?? []);

    const sourceIds =
      explicitCourseIds.length > 0
        ? explicitCourseIds
        : explicitCourseId
          ? [explicitCourseId]
          : cartItems.map((item) => item.courseId);

    const courseIds = Array.from(new Set(sourceIds.filter(Boolean)));

    if (courseIds.length === 0) {
      showToast("No course selected", "error");
      return;
    }

    let filteredCourseIds = courseIds;
    try {
      const enrollmentRes = await getMyEnrollments();
      const blockedStatuses = new Set(["enrolled", "in_progress", "completed"]);
      const enrolledCourseIds = new Set(
        enrollmentRes.data.enrollments
          .filter((row) => blockedStatuses.has(String(row.status || "").toLowerCase()))
          .map((row) => String(row.course)),
      );
      filteredCourseIds = courseIds.filter((id) => !enrolledCourseIds.has(String(id)));
    } catch {
      // Keep checkout working; backend still enforces duplicate enrollment protection.
    }

    if (filteredCourseIds.length === 0) {
      showToast("Selected courses are already enrolled", "error");
      return;
    }

    const courseMeta = typeof input === "object" ? input : undefined;
    if (
      filteredCourseIds.length === 1 &&
      isCourseFree(courseMeta?.isPaid, courseMeta?.finalPrice)
    ) {
      try {
        await createEnrollment(filteredCourseIds[0]);
        showToast("Enrolled successfully!", "success");
        router.push(`/student/courses`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Enrollment failed";
        showToast(message, "error");
      }
      return;
    }

    const payload =
      filteredCourseIds.length === 1
        ? { courseId: filteredCourseIds[0] }
        : { courseIds: filteredCourseIds };

    const result = await initiatePayment(payload);

    if (result.success && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
    } else {
      showToast(result.error || "Checkout failed", "error");
    }
  };

  return { 
    handleCheckout, 
    isPending: loading || authLoading, 
    toastMessage: toast?.message, 
    toastType: toast?.type,
    authLoading
  };
};
