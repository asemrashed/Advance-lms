'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LuArrowLeft as ArrowLeft, LuCheck as CheckCircle, LuX as XCircle, LuClock as Clock, LuTarget as Target, LuAward as Award, LuChartBar, LuEye as Eye, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { format } from 'date-fns';
import { studentExamService } from '@/services/studentExamService';
import { MathText, RichHtml } from '@/components/ui/MathText';

function formatResultDate(iso: string | undefined): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  try {
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
}

interface Question {
  _id: string;
  question: string;
  type: 'mcq' | 'written' | 'true_false' | 'fill_blank' | 'essay';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: Array<{
    _id: string;
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: string;
  explanation?: string;
}

interface ExamAttempt {
  _id: string;
  exam: {
    _id: string;
    title: string;
    type: string;
    duration: number;
    totalMarks: number;
    passingMarks: number;
  };
  student: string;
  status: 'in_progress' | 'completed' | 'pending_review' | 'abandoned';
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  scoresReleased?: boolean;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
    marks?: number;
    gradingStatus?: string;
  }>;
  startedAt: string;
  completedAt?: string;
}

function ExamResultsPageContent() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Get the latest completed attempt for this exam
      const response = await studentExamService.listExamAttemptsByQuery(
        `examId=${examId}&submitted=1`,
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam results');
      }
      
      const data = await response.json();
      const attempts = data.data.attempts;
      
      if (attempts.length === 0) {
        router.push(`/student/exams/${examId}/take`);
        return;
      }
      
      // Get the most recent attempt
      const latestAttempt = attempts[0];
      setAttempt(latestAttempt);
      
      // Fetch questions for review
      const questionsResponse = await studentExamService.getStudentExamWithAnswers(examId);
      
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.data.questions);
      }
      
    } catch (error) {
      console.error('Error fetching results:', error);
      router.push('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchResults();
    }
  }, [examId]);

  const getQuestionById = (questionId: string) => {
    return questions.find(q => q._id === questionId);
  };

  const answerIncludesOption = (answer: string | string[], questionId: string, optionId: string) => {
    const values = Array.isArray(answer) ? answer : [answer];
    return values.some((value) => value === optionId || value === `${questionId}-${optionId}`);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <StudentRoleShell>
        <main className="relative z-10 p-2 sm:p-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
      </StudentRoleShell>
    );
  }

  if (!attempt) {
    return (
      <StudentRoleShell>
        <main className="relative z-10 p-2 sm:p-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Results Not Found</h1>
            <p className="text-gray-600 mb-6">No completed attempt found for this exam.</p>
            <Button onClick={() => router.push('/student/exams')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exams
            </Button>
          </div>
        </main>
      </StudentRoleShell>
    );
  }

  const scoresReleased = attempt.status === "completed";

  const correctAnswers = attempt.answers.filter((a) => a.isCorrect === true).length;
  const totalQuestions = attempt.answers.length;

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{attempt.exam.title}</h1>
                <p className="text-gray-600">Exam Results</p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/student/exams')}
                className="border-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Exams
              </Button>
            </div>

            {!scoresReleased && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="p-4 text-sm text-amber-900">
                  Your attempt is awaiting instructor grading. You can review your own answers
                  below. Correct answers, model solutions, and final scores appear here after
                  grading is complete.
                </CardContent>
              </Card>
            )}

            {/* Result Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card
                className={`${
                  !scoresReleased
                    ? "bg-gray-50 border-gray-200"
                    : attempt.passed
                      ? "bg-gradient-to-br from-green-50 to-green-100"
                      : "bg-gradient-to-br from-red-50 to-red-100"
                } border-0 shadow-md`}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    {!scoresReleased ? (
                      <Clock className="w-8 h-8 text-gray-500" />
                    ) : attempt.passed ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    {!scoresReleased ? "Awaiting review" : attempt.passed ? "Passed" : "Failed"}
                  </h3>
                  <p className="text-2xl font-bold">
                    {scoresReleased && attempt.percentage != null ? `${attempt.percentage.toFixed(1)}%` : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Score</h3>
                  <p className="text-2xl font-bold">
                    {scoresReleased && attempt.score != null
                      ? `${attempt.score} / ${attempt.exam.totalMarks}`
                      : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Time Spent</h3>
                  <p className="text-2xl font-bold">
                    {formatTime(attempt.timeSpent)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LuChartBar className="w-5 h-5" />
                    Performance Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Correct Answers</span>
                        <span>
                          {correctAnswers} / {totalQuestions}
                        </span>
                      </div>
                      <Progress
                        value={totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                    {scoresReleased && attempt.percentage != null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Score Progress</span>
                          <span>{attempt.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={attempt.percentage} className="h-2" />
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Passing Marks Required:</span>
                      <span className="font-semibold">{attempt.exam.passingMarks}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Exam Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exam Type:</span>
                      <span className="font-medium">
                        {attempt.exam?.type?.toUpperCase() ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {attempt.exam?.duration ?? 0} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">
                        {formatResultDate(attempt.completedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {!scoresReleased ? (
                        <Badge variant="outline">Pending review</Badge>
                      ) : (
                        <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Question Review */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Question Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {attempt.answers.map((answer, index) => {
                  const question = getQuestionById(answer.questionId);
                  if (!question) return null;

                  const writtenLike = question.type === 'written' || question.type === 'essay';
                  const awaitingGrade = writtenLike && answer.gradingStatus === 'pending';

                  return (
                    <div key={answer.questionId} className="border-0 shadow-md rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Question {index + 1}:{' '}
                            <MathText text={question.question} />
                          </h4>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline">{question.marks} marks</Badge>
                            <Badge variant="outline">{question.difficulty}</Badge>
                            <Badge variant="outline">{question.type}</Badge>
                            {awaitingGrade || !scoresReleased ? (
                              <Badge className="bg-amber-100 text-amber-900">
                                <Clock className="w-3 h-3 mr-1" />
                                {awaitingGrade ? 'Pending instructor review' : 'Awaiting grading'}
                              </Badge>
                            ) : answer.isCorrect === true ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Correct
                              </Badge>
                            ) : answer.isCorrect === false ? (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                Incorrect
                              </Badge>
                            ) : writtenLike ? (
                              <Badge variant="outline">Graded</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Your Score</div>
                          <div className="font-semibold">
                            {!scoresReleased || awaitingGrade
                              ? '—'
                              : `${answer.marks ?? 0} / ${question.marks}`}
                          </div>
                        </div>
                      </div>

                      {/* MCQ Options Review */}
                      {question.type === 'mcq' && question.options && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Options:</p>
                          {question.options.map((option) => {
                            const isSelected = answerIncludesOption(
                              answer.answer,
                              answer.questionId,
                              option._id.toString(),
                            );
                            const isCorrect = scoresReleased && option.isCorrect;

                            return (
                              <div
                                key={option._id}
                                className={`p-3 rounded-lg border ${
                                  isCorrect
                                    ? 'bg-green-50 border-green-200'
                                    : isSelected
                                      ? scoresReleased
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-primary/5 border-primary/30'
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                                  {scoresReleased && isSelected && !isCorrect && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <MathText
                                    as="span"
                                    className={isCorrect || isSelected ? 'font-medium' : ''}
                                    text={option.text}
                                  />
                                  {isSelected && !scoresReleased && (
                                    <Badge variant="outline">Your choice</Badge>
                                  )}
                                  {isCorrect && (
                                    <Badge className="bg-green-100 text-green-800">Correct</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False Review */}
                      {question.type === 'true_false' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                          <div
                            className={`p-3 rounded-lg border ${
                              !scoresReleased
                                ? 'bg-gray-50 border-gray-200'
                                : answer.isCorrect
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <span className="font-medium">{answer.answer}</span>
                          </div>
                          {scoresReleased && question.correctAnswer?.trim() ? (
                            <p className="text-sm text-gray-600">
                              Correct Answer:{' '}
                              <span className="font-medium">
                                <MathText text={question.correctAnswer} />
                              </span>
                            </p>
                          ) : null}
                        </div>
                      )}

                      {/* Written/Essay Review */}
                      {(question.type === 'written' || question.type === 'essay') && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {answer.answer ? (
                              <RichHtml
                                className="text-sm text-foreground"
                                html={String(answer.answer)}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">No answer provided</p>
                            )}
                          </div>
                          {scoresReleased && question.correctAnswer ? (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <p className="text-sm font-medium text-blue-900">Model Answer:</p>
                              <MathText
                                as="p"
                                className="text-sm text-blue-800"
                                text={question.correctAnswer}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Fill in the Blank Review */}
                      {question.type === 'fill_blank' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                          <div
                            className={`p-3 rounded-lg border ${
                              !scoresReleased
                                ? 'bg-gray-50 border-gray-200'
                                : answer.isCorrect
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <span className="font-medium">
                              {answer.answer || 'No answer provided'}
                            </span>
                          </div>
                          {scoresReleased && !answer.isCorrect && question.correctAnswer ? (
                            <p className="text-sm text-gray-600">
                              Correct Answer:{' '}
                              <span className="font-medium">
                                <MathText text={question.correctAnswer} />
                              </span>
                            </p>
                          ) : null}
                        </div>
                      )}

                      {/* Explanation — only after grading */}
                      {scoresReleased && question.explanation ? (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border">
                          <p className="text-sm font-medium text-blue-900">Explanation:</p>
                          <MathText
                            as="p"
                            className="text-sm text-blue-800"
                            text={question.explanation}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => router.push('/student/exams')}
              variant="outline"
              className="border-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exams
            </Button>
            <Button
              onClick={() => router.push(`/student/exams/${examId}/take`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Exam
            </Button>
          </div>
        </div>
      </main>
    </StudentRoleShell>
  );
}

export default function ExamResultsPage() {
  return <ExamResultsPageContent />;
}
