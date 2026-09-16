import { useCallback, useState } from "react";
import {
  bulkSaveLessonQuizQuestions,
  deleteLessonQuizQuestion,
  getLessonQuizQuestions,
  type LessonQuizQuestion,
} from "@/lib/api/lessonQuizClient";

export type LessonQuizQuestionInput = {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  isActive?: boolean;
};

export type { LessonQuizQuestion as LessonQuizQuestionView };

export function useLessonQuiz() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (lessonId: string): Promise<LessonQuizQuestion[]> => {
    setLoading(true);
    setError(null);
    try {
      return await getLessonQuizQuestions(lessonId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load questions";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkCreate = useCallback(
    async (lessonId: string, questions: LessonQuizQuestionInput[]) => {
      setLoading(true);
      setError(null);
      try {
        return await bulkSaveLessonQuizQuestions(lessonId, questions);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to create questions";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const removeQuestion = useCallback(async (questionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteLessonQuizQuestion(questionId);
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete question";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchQuestions, bulkCreate, removeQuestion };
}
