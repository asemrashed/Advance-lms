import mongoose from "mongoose";
import Subject from "@/models/Subject";
import { normalizeBatchGrade } from "@/lib/batchGrades";

export async function resolveResourceSubject(
  body: Record<string, unknown>,
  options: { requireChapter?: boolean } = {},
) {
  const subjectId =
    typeof body.subjectId === "string" && mongoose.Types.ObjectId.isValid(body.subjectId)
      ? body.subjectId
      : "";
  const subjectName = typeof body.subject === "string" ? body.subject.trim() : "";
  const subjectCode =
    typeof body.subjectCode === "string" ? body.subjectCode.trim().toUpperCase() : "";

  if (!subjectId && !subjectCode && !subjectName) {
    return { error: "Select a valid subject", value: null };
  }

  const subject = await Subject.findOne(
    subjectId
      ? { _id: subjectId }
      : subjectCode
        ? { code: subjectCode }
        : { name: { $regex: `^${subjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
  ).lean();

  if (!subject) {
    return { error: "Select a valid subject", value: null };
  }

  const requestedChapter =
    typeof body.chapter === "string"
      ? body.chapter.trim()
      : typeof body.topic === "string"
        ? body.topic.trim()
        : "";
  const chapter = (subject.chapters || []).find(
    (row: { name?: string }) =>
      String(row.name).trim().toLowerCase() === requestedChapter.toLowerCase(),
  );

  if (options.requireChapter && !chapter) {
    return { error: "Select a valid chapter for this subject", value: null };
  }

  return {
    error: null,
    value: {
      subjectId: subject._id,
      subject: String(subject.name),
      subjectCode: String(subject.code || ""),
      grade: subject.grade
        ? normalizeBatchGrade(String(subject.grade))
        : undefined,
      chapter: chapter ? String(chapter.name) : undefined,
    },
  };
}

export const RESOURCE_SCOPE_UNSET = {
  batchId: "",
  batchClassId: "",
  subjectModuleId: "",
  subjectLessonId: "",
  courseId: "",
  chapterId: "",
  lessonId: "",
} as const;
