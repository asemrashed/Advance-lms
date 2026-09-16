import type { McqQuestionInput } from "./validation";

export function sanitizeAssignmentForStudent(
  assignment: Record<string, unknown>,
  latestSubmission?: Record<string, unknown> | null,
) {
  const type = String(assignment.type || "");
  if (type !== "mcq") return assignment;

  const questions = Array.isArray(assignment.mcqQuestions)
    ? (assignment.mcqQuestions as McqQuestionInput[])
    : [];
  const submissionStatus = String(latestSubmission?.status || "");
  const reveal =
    Boolean(assignment.showCorrectAnswers) &&
    (submissionStatus === "graded" || submissionStatus === "returned");

  return {
    ...assignment,
    mcqQuestions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      marks: q.marks,
      ...(reveal ? { correctOptionIndex: q.correctOptionIndex } : {}),
    })),
  };
}
