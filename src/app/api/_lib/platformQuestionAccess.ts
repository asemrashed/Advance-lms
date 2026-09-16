import QBAccessRequest, {
  type QBAccessScopeType,
} from "@/models/QBAccessRequest";
import PlatformQuestion from "@/models/PlatformQuestion";
import Subject from "@/models/Subject";
import {
  PLATFORM_QB_ACCESS_FEE,
  isPlatformQbPaidAccessEnabled,
} from "@/lib/platformQbAccess";
import { getDisplayName } from "@/lib/displayName";
import { isAdminAreaRole } from "@/lib/roles";
import {
  isObjectId,
  pagination,
  parseLimit,
  parsePage,
  toObjectId,
  escapeRegex,
  type SessionUser,
} from "@/app/api/_lib/phase12";

/** Approved grant that has not passed `expiresAt` (if set). */
export function activeAccessGrantQuery(requesterId: string) {
  const now = new Date();
  return {
    requesterId: toObjectId(requesterId),
    status: "approved",
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  };
}

export async function listActiveGrants(requesterId: string) {
  return QBAccessRequest.find(activeAccessGrantQuery(requesterId))
    .sort({ grantedAt: -1 })
    .lean();
}

export async function instructorHasActiveAdminQBAccess(requesterId: string): Promise<boolean> {
  const doc = await QBAccessRequest.findOne(activeAccessGrantQuery(requesterId))
    .select("_id")
    .lean();
  return Boolean(doc);
}

/** True when instructor has an active full-platform grant. */
export async function instructorHasFullAdminQBAccess(requesterId: string): Promise<boolean> {
  const doc = await QBAccessRequest.findOne({
    ...activeAccessGrantQuery(requesterId),
    scopeType: "full",
  })
    .select("_id")
    .lean();
  return Boolean(doc);
}

function scopeMatchesQuestion(
  grant: {
    scopeType?: string;
    subjectId?: unknown;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
    topics?: string[];
  },
  q: {
    subjectId?: unknown;
    subjectCode?: string;
    subject?: string;
    grade?: string;
    topic?: string;
  },
): boolean {
  const scopeType = (grant.scopeType || "full") as QBAccessScopeType;
  if (scopeType === "full") return true;

  const subjectOk =
    (grant.subjectId &&
      q.subjectId &&
      String(grant.subjectId) === String(q.subjectId)) ||
    (grant.subjectCode &&
      q.subjectCode &&
      String(grant.subjectCode).toUpperCase() === String(q.subjectCode).toUpperCase()) ||
    (grant.subjectName &&
      q.subject &&
      String(grant.subjectName).toLowerCase() === String(q.subject).toLowerCase());

  if (!subjectOk) return false;
  if (grant.grade && q.grade && String(grant.grade).toUpperCase() !== String(q.grade).toUpperCase()) {
    return false;
  }
  if (scopeType === "subject") return true;

  const topics = Array.isArray(grant.topics) ? grant.topics.map((t) => String(t).trim()) : [];
  if (!topics.length) return false;
  return topics.includes(String(q.topic || "").trim());
}

/** Mongo filter: instructor's own questions + admin-owned rows covered by active grants. */
export async function buildInstructorPlatformQuestionScope(
  userId: string,
): Promise<Record<string, unknown>> {
  const ownId = toObjectId(userId);
  const grants = await listActiveGrants(userId);
  if (!grants.length) {
    return { ownerId: ownId };
  }

  const adminClauses: Record<string, unknown>[] = [];
  for (const g of grants) {
    const scopeType = (g.scopeType || "full") as QBAccessScopeType;
    if (scopeType === "full") {
      return {
        $or: [{ ownerId: ownId }, { ownerType: "admin" }],
      };
    }

    const subjectParts: Record<string, unknown>[] = [];
    if (g.subjectId) subjectParts.push({ subjectId: g.subjectId });
    if (g.subjectCode) subjectParts.push({ subjectCode: String(g.subjectCode).toUpperCase() });
    if (g.subjectName) subjectParts.push({ subject: g.subjectName });

    if (!subjectParts.length) continue;

    const clause: Record<string, unknown> = {
      ownerType: "admin",
      $or: subjectParts,
    };
    if (g.grade) clause.grade = String(g.grade).toUpperCase();
    if (scopeType === "topics") {
      const topics = ((g.topics || []) as string[]).map((t: string) => String(t).trim()).filter(Boolean);
      if (!topics.length) continue;
      clause.topic = { $in: topics };
    }
    adminClauses.push(clause);
  }

  if (!adminClauses.length) {
    return { ownerId: ownId };
  }

  return {
    $or: [{ ownerId: ownId }, ...adminClauses],
  };
}

export async function instructorCanViewAdminQuestion(
  userId: string,
  question: {
    ownerType?: string;
    subjectId?: unknown;
    subjectCode?: string;
    subject?: string;
    grade?: string;
    topic?: string;
  },
): Promise<boolean> {
  if (question.ownerType !== "admin") return false;
  const grants = await listActiveGrants(userId);
  return grants.some((g) => scopeMatchesQuestion(g, question));
}

export function serializeAccessRequest(doc: Record<string, unknown>) {
  const requester = doc.requesterId as Record<string, unknown> | undefined;
  const grantedBy = doc.grantedBy as Record<string, unknown> | undefined;

  const requesterName =
    requester && typeof requester === "object"
      ? String(
          requester.name ||
            getDisplayName(requester) ||
            "",
        )
      : undefined;
  const requesterEmail =
    requester && typeof requester === "object" && requester.email
      ? String(requester.email)
      : undefined;

  return {
    ...doc,
    _id: String(doc._id),
    requesterId:
      requester && typeof requester === "object" && "_id" in requester
        ? String(requester._id)
        : String(doc.requesterId),
    requesterName,
    requesterEmail,
    grantedBy:
      grantedBy && typeof grantedBy === "object" && "_id" in grantedBy
        ? String(grantedBy._id)
        : doc.grantedBy
          ? String(doc.grantedBy)
          : undefined,
    scopeType: (doc.scopeType as string) || "full",
    topics: Array.isArray(doc.topics) ? doc.topics.map((t) => String(t)) : [],
    source: (doc.source as string) || "instructor_request",
    copiedCount: doc.copiedCount != null ? Number(doc.copiedCount) : undefined,
    copiedAt: doc.copiedAt ? new Date(String(doc.copiedAt)).toISOString() : undefined,
    grantedAt: doc.grantedAt ? new Date(String(doc.grantedAt)).toISOString() : undefined,
    expiresAt: doc.expiresAt ? new Date(String(doc.expiresAt)).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : undefined,
  };
}

function parseScopeFromBody(body: Record<string, unknown>): {
  scopeType: QBAccessScopeType;
  topics: string[];
} {
  const raw = String(body.scopeType || "full").trim();
  const scopeType: QBAccessScopeType =
    raw === "subject" || raw === "topics" ? raw : "full";
  const topics = Array.isArray(body.topics)
    ? body.topics.map((t) => String(t).trim()).filter(Boolean)
    : [];
  return { scopeType, topics };
}

async function resolveAmount(
  body: Record<string, unknown>,
  scopeType: QBAccessScopeType,
  subjectFields: { subjectId?: string; subjectCode?: string },
): Promise<number | undefined> {
  if (body.amount != null && Number.isFinite(Number(body.amount))) {
    return Math.max(0, Number(body.amount));
  }
  if (!Boolean(body.isPaid)) return undefined;

  if (scopeType !== "full" && subjectFields.subjectId) {
    const sub = await Subject.findById(subjectFields.subjectId).select("qbAccessPrice").lean();
    if (sub?.qbAccessPrice != null && Number.isFinite(Number(sub.qbAccessPrice))) {
      return Math.max(0, Number(sub.qbAccessPrice));
    }
  }
  return PLATFORM_QB_ACCESS_FEE;
}

async function finalizeApproval(
  doc: InstanceType<typeof QBAccessRequest>,
  adminUser?: SessionUser,
) {
  // Shared access model: do not bulk-clone Platform QB into the instructor bank.
  // Instructors use linked shared questions; a private copy is created only on edit (copy-on-write).
  // Bulk-clone helper archived at junk/EduPlatform/src/app/api/_lib/copyPlatformQuestionsForGrant.ts
  doc.copiedCount = 0;
  doc.copiedAt = new Date();
  if (adminUser) doc.grantedBy = toObjectId(adminUser.id);
  await doc.save();
  return 0;
}

/** Mongo filter for admin PlatformQuestions covered by an instructor's active grants. */
export async function buildGrantedPlatformQuestionFilter(
  userId: string,
): Promise<Record<string, unknown> | null> {
  const grants = await listActiveGrants(userId);
  if (!grants.length) return null;

  const clauses: Record<string, unknown>[] = [];
  for (const g of grants) {
    const scopeType = (g.scopeType || "full") as QBAccessScopeType;
    if (scopeType === "full") {
      return { ownerType: "admin", isActive: { $ne: false } };
    }
    const subjectParts: Record<string, unknown>[] = [];
    if (g.subjectId) subjectParts.push({ subjectId: g.subjectId });
    if (g.subjectCode) {
      subjectParts.push({ subjectCode: String(g.subjectCode).toUpperCase() });
    }
    if (g.subjectName) subjectParts.push({ subject: g.subjectName });
    if (!subjectParts.length) continue;
    const clause: Record<string, unknown> = {
      ownerType: "admin",
      isActive: { $ne: false },
      $or: subjectParts,
    };
    if (g.grade) clause.grade = String(g.grade).toUpperCase();
    if (scopeType === "topics") {
      const topics = ((g.topics || []) as string[])
        .map((t: string) => String(t).trim())
        .filter(Boolean);
      if (!topics.length) continue;
      clause.topic = { $in: topics };
    }
    clauses.push(clause);
  }
  if (!clauses.length) return null;
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
}

/**
 * Copy-on-write: create an instructor-owned Question from a PlatformQuestion.
 * Idempotent when a fork already exists.
 */
export async function forkPlatformQuestionForInstructor(
  userId: string,
  platformQuestionId: string,
): Promise<{ error?: string; status?: number; question?: Record<string, unknown> }> {
  if (!isObjectId(platformQuestionId)) {
    return { error: "Invalid question id", status: 400 };
  }

  const PlatformQuestion = (await import("@/models/PlatformQuestion")).default;
  const Question = (await import("@/models/Question")).default;

  const source = await PlatformQuestion.findById(platformQuestionId).lean();
  if (!source || source.ownerType !== "admin" || source.isActive === false) {
    return { error: "Platform question not found", status: 404 };
  }

  const allowed = await instructorCanViewAdminQuestion(userId, {
    ownerType: String(source.ownerType || ""),
    subjectId: source.subjectId,
    subjectCode: source.subjectCode ? String(source.subjectCode) : undefined,
    subject: source.subject ? String(source.subject) : undefined,
    grade: source.grade ? String(source.grade) : undefined,
    topic: source.topic ? String(source.topic) : undefined,
  });
  if (!allowed) {
    return { error: "You do not have access to this platform question", status: 403 };
  }

  const existing = await Question.findOne({
    createdBy: toObjectId(userId),
    sourcePlatformQuestionId: source._id,
  }).lean();
  if (existing) {
    return {
      question: {
        ...existing,
        _id: String(existing._id),
        sourcePlatformQuestionId: String(source._id),
        isSharedPlatform: false,
        isForked: true,
      },
    };
  }

  const difficultyMap: Record<number, "easy" | "medium" | "hard"> = {
    1: "easy",
    2: "medium",
    3: "hard",
  };
  const format = source.questionFormat === "written" ? "written" : "mcq";
  const options = Array.isArray(source.options)
    ? source.options.map((o: { text?: string; isCorrect?: boolean }) => ({
        text: String(o.text || "").trim(),
        isCorrect: Boolean(o.isCorrect),
      }))
    : [];

  const created = await Question.create({
    question: String(source.questionText || ""),
    type: format,
    marks: Number(source.marks) > 0 ? Number(source.marks) : 1,
    difficulty: difficultyMap[Number(source.difficulty) as 1 | 2 | 3] || "medium",
    category: source.subject ? String(source.subject) : undefined,
    tags: [
      "platform-borrow",
      source.subject ? String(source.subject) : "",
      source.topic ? String(source.topic) : "",
    ].filter(Boolean),
    options: format === "mcq" ? options : [],
    correctAnswer: source.answerText ? String(source.answerText) : undefined,
    explanation: source.explanation ? String(source.explanation) : undefined,
    isActive: true,
    createdBy: toObjectId(userId),
    sourcePlatformQuestionId: source._id,
  });

  const obj = created.toObject() as Record<string, unknown>;
  return {
    question: {
      ...obj,
      _id: String(created._id),
      sourcePlatformQuestionId: String(source._id),
      isSharedPlatform: false,
      isForked: true,
    },
  };
}

export async function listAccessRequests(user: SessionUser, searchParams: URLSearchParams) {
  const page = parsePage(searchParams);
  const limit = parseLimit(searchParams, 20, 100);
  const skip = (page - 1) * limit;
  const status = (searchParams.get("status") || "").trim();
  const search = (searchParams.get("search") || "").trim();

  const filter: Record<string, unknown> = {};
  if (user.role === "instructor") {
    filter.requesterId = toObjectId(user.id);
  }
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }
  if (search && isAdminAreaRole(user.role)) {
    const safe = escapeRegex(search);
    filter.$or = [
      { subjectName: { $regex: safe, $options: "i" } },
      { subjectCode: { $regex: safe, $options: "i" } },
      { note: { $regex: safe, $options: "i" } },
      { grade: { $regex: safe, $options: "i" } },
    ];
  }

  const [rows, total] = await Promise.all([
    QBAccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("requesterId", "name email role")
      .populate("grantedBy", "name")
      .lean(),
    QBAccessRequest.countDocuments(filter),
  ]);

  return {
    requests: rows.map((r) => serializeAccessRequest(r as Record<string, unknown>)),
    pagination: pagination(page, limit, total),
  };
}

export async function getInstructorAccessSummary(requesterId: string) {
  const [activeGrants, latestPending] = await Promise.all([
    listActiveGrants(requesterId),
    QBAccessRequest.findOne({ requesterId: toObjectId(requesterId), status: "pending" })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const hasFull = activeGrants.some((g) => (g.scopeType || "full") === "full");

  return {
    hasActiveGrant: activeGrants.length > 0,
    hasFullGrant: hasFull,
    activeGrant: activeGrants[0]
      ? serializeAccessRequest(activeGrants[0] as Record<string, unknown>)
      : null,
    activeGrants: activeGrants.map((g) =>
      serializeAccessRequest(g as Record<string, unknown>),
    ),
    pendingRequest: latestPending
      ? serializeAccessRequest(latestPending as Record<string, unknown>)
      : null,
    paidAccessEnabled: isPlatformQbPaidAccessEnabled(),
    paidAccessFee: PLATFORM_QB_ACCESS_FEE,
  };
}

export async function createAccessRequest(
  user: SessionUser,
  body: Record<string, unknown>,
) {
  const { scopeType, topics } = parseScopeFromBody(body);

  if (scopeType === "topics" && !topics.length) {
    return { error: "Select at least one topic", status: 400 as const };
  }
  if (scopeType !== "full") {
    const subjectFields = await (async () => {
      const { enrichSubjectFields, buildSubjectFieldsFromBody } = await import(
        "@/app/api/_lib/subjects"
      );
      return enrichSubjectFields(buildSubjectFieldsFromBody(body));
    })();
    if (!subjectFields.subjectId && !subjectFields.subjectCode && !subjectFields.subjectName) {
      return { error: "Subject is required for scoped access", status: 400 as const };
    }
  }

  // Allow multiple pending requests only when scopes differ; block duplicate pending of same scope.
  const subjectFields = await (async () => {
    const { enrichSubjectFields, buildSubjectFieldsFromBody } = await import(
      "@/app/api/_lib/subjects"
    );
    return enrichSubjectFields(buildSubjectFieldsFromBody(body));
  })();

  const pendingDupFilter: Record<string, unknown> = {
    requesterId: toObjectId(user.id),
    status: "pending",
    scopeType,
  };
  if (scopeType !== "full") {
    if (subjectFields.subjectId) pendingDupFilter.subjectId = toObjectId(subjectFields.subjectId);
    else if (subjectFields.subjectCode) pendingDupFilter.subjectCode = subjectFields.subjectCode;
  }
  const existingPending = await QBAccessRequest.findOne(pendingDupFilter).lean();
  if (existingPending) {
    return { error: "You already have a pending request for this scope", status: 409 as const };
  }

  const fullActive = await instructorHasFullAdminQBAccess(user.id);
  if (fullActive) {
    return { error: "You already have full platform question bank access", status: 409 as const };
  }

  const note = body.note ? String(body.note).trim() : undefined;
  const isPaid = Boolean(body.isPaid);
  const amount = await resolveAmount(body, scopeType, subjectFields);

  const doc = await QBAccessRequest.create({
    requesterId: toObjectId(user.id),
    status: "pending",
    scopeType,
    topics: scopeType === "topics" ? topics : [],
    isPaid,
    amount,
    note,
    source: "instructor_request",
    subjectId: subjectFields.subjectId
      ? toObjectId(subjectFields.subjectId)
      : undefined,
    subjectCode: subjectFields.subjectCode || undefined,
    subjectName: subjectFields.subjectName || undefined,
    grade: subjectFields.grade || undefined,
  });

  return { doc: serializeAccessRequest(doc.toObject() as Record<string, unknown>) };
}

export async function patchAccessRequest(
  adminUser: SessionUser,
  requestId: string,
  body: Record<string, unknown>,
) {
  if (!isObjectId(requestId)) {
    return { error: "Invalid request id", status: 400 as const };
  }

  const doc = await QBAccessRequest.findById(requestId);
  if (!doc) {
    return { error: "Access request not found", status: 404 as const };
  }

  const status = body.status ? String(body.status) : "";
  if (!["approved", "rejected"].includes(status)) {
    return { error: "status must be approved or rejected", status: 400 as const };
  }

  doc.status = status as "approved" | "rejected";
  if (body.note !== undefined) {
    doc.note = String(body.note || "").trim() || undefined;
  }

  if (status === "approved") {
    doc.grantedAt = new Date();
    if (body.expiresAt) {
      const exp = new Date(String(body.expiresAt));
      if (!Number.isNaN(exp.getTime())) doc.expiresAt = exp;
    } else if (body.expiresInDays != null) {
      const days = Number.parseInt(String(body.expiresInDays), 10);
      if (Number.isFinite(days) && days > 0) {
        doc.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    } else {
      doc.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
    await finalizeApproval(doc, adminUser);
  } else {
    doc.grantedAt = undefined;
    doc.expiresAt = undefined;
    await doc.save();
  }

  await doc.populate("requesterId", "name email role");
  await doc.populate("grantedBy", "name");
  return { doc: serializeAccessRequest(doc.toObject() as Record<string, unknown>) };
}

/** Admin directly grants access (no pending request). Triggers copy-on-approve. */
export async function adminGrantAccess(
  adminUser: SessionUser,
  body: Record<string, unknown>,
) {
  const instructorId = String(body.instructorId || body.requesterId || "").trim();
  if (!isObjectId(instructorId)) {
    return { error: "Valid instructorId is required", status: 400 as const };
  }

  const { scopeType, topics } = parseScopeFromBody(body);
  if (scopeType === "topics" && !topics.length) {
    return { error: "Select at least one topic", status: 400 as const };
  }

  const subjectFields = await (async () => {
    const { enrichSubjectFields, buildSubjectFieldsFromBody } = await import(
      "@/app/api/_lib/subjects"
    );
    return enrichSubjectFields(buildSubjectFieldsFromBody(body));
  })();

  if (scopeType !== "full") {
    if (!subjectFields.subjectId && !subjectFields.subjectCode && !subjectFields.subjectName) {
      return { error: "Subject is required for scoped access", status: 400 as const };
    }
  }

  if (scopeType === "full") {
    const existingFull = await QBAccessRequest.findOne({
      ...activeAccessGrantQuery(instructorId),
      scopeType: "full",
    }).lean();
    if (existingFull) {
      return { error: "Instructor already has full platform QB access", status: 409 as const };
    }
  }

  let expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  if (body.expiresAt) {
    const exp = new Date(String(body.expiresAt));
    if (!Number.isNaN(exp.getTime())) expiresAt = exp;
  } else if (body.expiresInDays != null) {
    const days = Number.parseInt(String(body.expiresInDays), 10);
    if (Number.isFinite(days) && days > 0) {
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }

  const note = body.note ? String(body.note).trim() : undefined;
  const isPaid = Boolean(body.isPaid);
  const amount = await resolveAmount(body, scopeType, subjectFields);

  const doc = await QBAccessRequest.create({
    requesterId: toObjectId(instructorId),
    status: "approved",
    scopeType,
    topics: scopeType === "topics" ? topics : [],
    isPaid,
    amount,
    note,
    source: "admin_grant",
    grantedAt: new Date(),
    expiresAt,
    grantedBy: toObjectId(adminUser.id),
    subjectId: subjectFields.subjectId
      ? toObjectId(subjectFields.subjectId)
      : undefined,
    subjectCode: subjectFields.subjectCode || undefined,
    subjectName: subjectFields.subjectName || undefined,
    grade: subjectFields.grade || undefined,
  });

  await finalizeApproval(doc, adminUser);
  await doc.populate("requesterId", "name email role");
  await doc.populate("grantedBy", "name");
  return { doc: serializeAccessRequest(doc.toObject() as Record<string, unknown>) };
}

/** Called from payment fulfillment after SSL success. */
export async function approveAccessRequestAfterPayment(requestId: unknown) {
  const doc = await QBAccessRequest.findById(requestId);
  if (!doc) return;
  if (doc.status === "approved" && doc.copiedAt) return;

  doc.status = "approved";
  doc.isPaid = true;
  doc.grantedAt = new Date();
  doc.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await finalizeApproval(doc);
}

/** Resolve access price for a subject (or full-platform fee). */
export async function resolveQbAccessPrice(opts: {
  subjectId?: string;
  subjectCode?: string;
  scopeType?: QBAccessScopeType;
}): Promise<number> {
  if (opts.scopeType === "full" || (!opts.subjectId && !opts.subjectCode)) {
    return PLATFORM_QB_ACCESS_FEE;
  }
  let sub = null;
  if (opts.subjectId && isObjectId(opts.subjectId)) {
    sub = await Subject.findById(opts.subjectId).select("qbAccessPrice").lean();
  } else if (opts.subjectCode) {
    sub = await Subject.findOne({
      code: String(opts.subjectCode).toUpperCase(),
    })
      .select("qbAccessPrice")
      .lean();
  }
  if (sub?.qbAccessPrice != null && Number.isFinite(Number(sub.qbAccessPrice))) {
    return Math.max(0, Number(sub.qbAccessPrice));
  }
  return PLATFORM_QB_ACCESS_FEE;
}
