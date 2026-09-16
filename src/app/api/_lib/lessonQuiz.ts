import mongoose from "mongoose";

export function toObjectId(value: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export function correctOptionIndexFromQuestion(q: {
  options?: { isCorrect?: boolean }[];
}): number {
  const opts = q.options || [];
  return opts.findIndex((o) => o.isCorrect);
}

export function optionsToStrings(options?: { text?: string }[]): string[] {
  return (options || []).map((o) => String(o.text ?? ""));
}

export function serializeQuizResultRow(doc: Record<string, unknown>) {
  return {
    _id: String(doc._id),
    scorePercentage: Number(doc.scorePercentage ?? 0),
    correctAnswers: Number(doc.correctAnswers ?? 0),
    totalQuestions: Number(doc.totalQuestions ?? 0),
    isPracticeMode: Boolean(doc.isPracticeMode),
    submittedAt:
      doc.submittedAt instanceof Date
        ? doc.submittedAt.toISOString()
        : doc.submittedAt,
  };
}
