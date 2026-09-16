import { IExam } from '@/models/Exam';
import { IQuestion } from '@/models/Question';
import { IExamAttempt } from '@/models/ExamAttempt';

export interface Exam extends Omit<IExam, '_id' | 'createdAt' | 'updatedAt'> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  status?: 'draft' | 'published' | 'scheduled' | 'active' | 'expired' | 'inactive';
}

export interface Question extends Omit<IQuestion, '_id' | 'createdAt' | 'updatedAt'> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  correctOptionsCount?: number;
  totalOptionsCount?: number;
}

export interface ExamAttempt extends Omit<IExamAttempt, '_id' | 'createdAt' | 'updatedAt'> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  duration?: number;
  timeRemaining?: number;
}

export interface ExamFilters {
  search?: string;
  type?: 'mcq' | 'written' | 'mixed' | 'all';
  status?: 'draft' | 'published' | 'scheduled' | 'active' | 'expired' | 'inactive' | 'all';
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
  course?: string;
  createdBy?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'totalMarks' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface QuestionFilters {
  search?: string;
  type?: 'mcq' | 'written' | 'true_false' | 'fill_blank' | 'essay' | 'all';
  difficulty?: 'easy' | 'medium' | 'hard' | 'all';
  category?: string;
  tags?: string[];
  exam?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'question' | 'createdAt' | 'updatedAt' | 'marks' | 'difficulty';
  sortOrder?: 'asc' | 'desc';
}

export interface ExamAttemptFilters {
  exam?: string;
  student?: string;
  status?: 'in_progress' | 'completed' | 'pending_review' | 'abandoned' | 'timeout' | 'all';
  isPassed?: boolean;
  isSubmitted?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'submittedAt' | 'marksObtained' | 'percentage';
  sortOrder?: 'asc' | 'desc';
}

export interface ExamStats {
  totalExams: number;
  publishedExams: number;
  draftExams: number;
  activeExams: number;
  totalQuestions: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  examsByType: {
    mcq: number;
    written: number;
    mixed: number;
  };
  examsByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  recentExams: Exam[];
  topPerformingExams: {
    exam: Exam;
    averageScore: number;
    totalAttempts: number;
  }[];
}

export interface QuestionStats {
  totalQuestions: number;
  activeQuestions: number;
  questionsByType: {
    mcq: number;
    written: number;
    true_false: number;
    fill_blank: number;
    essay: number;
  };
  questionsByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionsByCategory: {
    category: string;
    count: number;
  }[];
  recentQuestions: Question[];
}

export interface ExamAttemptStats {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  averageScore: number;
  averageTimeSpent: number;
  attemptsByStatus: {
    in_progress: number;
    completed: number;
    abandoned: number;
    timeout: number;
  };
  recentAttempts: ExamAttempt[];
  topPerformers: {
    student: {
      _id: string;
      name: string;
      email: string;
    };
    exam: Exam;
    marksObtained: number;
    percentage: number;
    submittedAt: string;
  }[];
}

export interface CreateExamData {
  title: string;
  description?: string;
  type: 'mcq' | 'written' | 'mixed';
  /** Subject exam component — type is derived from this. */
  componentId?: string;
  componentName?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  /** Required for new exams — live course ObjectId. */
  course: string;
  subject?: string;
  subjectCode?: string;
  grade?: string;
  questions?: string[];
  attempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswers?: boolean;
  showResults?: boolean;
  allowReview?: boolean;
  timeLimit?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
}

export interface UpdateExamData extends Partial<CreateExamData> {
  isActive?: boolean;
  isPublished?: boolean;
}

export interface CreateQuestionData {
  question: string;
  type: 'mcq' | 'written' | 'true_false' | 'fill_blank' | 'essay';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  options?: {
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  correctAnswer?: string;
  explanation?: string;
  hints?: string[];
  timeLimit?: number;
  exam?: string;
}

export interface UpdateQuestionData extends Partial<CreateQuestionData> {
  isActive?: boolean;
}

export interface ExamAnswer {
  question: string;
  selectedOptions?: string[];
  writtenAnswer?: string;
  isCorrect?: boolean;
  marksObtained?: number;
  timeSpent?: number;
  isAnswered: boolean;
  gradingStatus?: 'pending' | 'graded';
}

export interface SubmitExamData {
  exam: string;
  answers: ExamAnswer[];
  timeSpent: number;
}
