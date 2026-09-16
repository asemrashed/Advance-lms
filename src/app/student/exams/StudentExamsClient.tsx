'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import WelcomeSection from '@/components/WelcomeSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { studentExamService } from '@/services/studentExamService';
import { htmlToPlainText } from '@/lib/utils';
import {
  LuCalendarDays,
  LuCheck,
  LuCirclePlay,
  LuClock3,
  LuEye,
  LuFileCheck2,
  LuGraduationCap,
  LuRotateCcw,
  LuSearch,
  LuTimer,
} from 'react-icons/lu';

interface Exam {
  _id: string;
  title: string;
  description: string;
  type: 'mcq' | 'written' | 'mixed';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  isActive: boolean;
  isPublished: boolean;
  startDate?: string;
  endDate?: string;
  course?: { _id: string; title: string };
  questionCount: number;
  attempts: number;
}

interface ExamAttempt {
  _id: string;
  examId?: string;
  exam: string | { _id: string };
  status: 'in_progress' | 'completed' | 'abandoned';
  score: number;
  percentage: number;
  passed: boolean;
  remainingSeconds?: number;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

type ExamFilter = 'all' | 'upcoming' | 'available' | 'in_progress' | 'completed';

function attemptExamId(attempt: ExamAttempt) {
  if (attempt.examId) return attempt.examId;
  return typeof attempt.exam === 'string' ? attempt.exam : attempt.exam?._id || '';
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExamFilter>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [examData, attemptData] = await Promise.all([
          studentExamService.getStudentExams(new URLSearchParams({ page: '1', limit: '100' })),
          studentExamService.getStudentExamAttempts(),
        ]);
        setExams((examData.exams as Exam[]) || []);
        setAttempts((attemptData.attempts as ExamAttempt[]) || []);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
    const refresh = window.setInterval(async () => {
      try {
        const data = await studentExamService.getStudentExamAttempts();
        setAttempts((data.attempts as ExamAttempt[]) || []);
      } catch {
        // Keep the current cards usable if a background refresh fails.
      }
    }, 30_000);
    return () => window.clearInterval(refresh);
  }, []);

  const attemptsFor = (examId: string) => attempts.filter((attempt) => attemptExamId(attempt) === examId);
  const latestCompleted = (examId: string) => [...attemptsFor(examId)]
    .filter((attempt) => attempt.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime())[0];
  const inProgress = (examId: string) => attemptsFor(examId).find((attempt) => attempt.status === 'in_progress');

  const scheduleStatus = (exam: Exam) => {
    const now = Date.now();
    if (!exam.isPublished || !exam.isActive) return 'unavailable';
    if (exam.startDate && new Date(exam.startDate).getTime() > now) return 'upcoming';
    if (exam.endDate && new Date(exam.endDate).getTime() < now) return 'expired';
    return 'available';
  };

  const canStart = (exam: Exam) => {
    const max = Math.max(1, Number(exam.attempts) || 1);
    return scheduleStatus(exam) === 'available' && !inProgress(exam._id) && attemptsFor(exam._id).length < max;
  };

  const displayStatus = (exam: Exam): Exclude<ExamFilter, 'all'> | 'expired' | 'unavailable' => {
    if (inProgress(exam._id)) return 'in_progress';
    if (latestCompleted(exam._id)) return 'completed';
    return scheduleStatus(exam) as 'available' | 'upcoming' | 'expired' | 'unavailable';
  };

  const filtered = useMemo(() => exams.filter((exam) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || exam.title.toLowerCase().includes(query)
      || exam.course?.title?.toLowerCase().includes(query)
      || htmlToPlainText(exam.description || '').toLowerCase().includes(query);
    return matchesSearch && (filter === 'all' || displayStatus(exam) === filter);
  }), [exams, attempts, filter, search]);

  const counts = useMemo(() => {
    const result: Record<ExamFilter, number> = { all: exams.length, upcoming: 0, available: 0, in_progress: 0, completed: 0 };
    exams.forEach((exam) => {
      const value = displayStatus(exam);
      if (value in result) result[value as ExamFilter] += 1;
    });
    return result;
  }, [exams, attempts]);

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5">
        <WelcomeSection title="Exams" description="Scheduled assessments across your courses" />

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'upcoming', 'available', 'in_progress', 'completed'] as ExamFilter[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? 'default' : 'ghost'}
                onClick={() => setFilter(value)}
                className={filter === value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              >
                {value === 'in_progress' ? 'In Progress' : value[0].toUpperCase() + value.slice(1)} ({counts[value]})
              </Button>
            ))}
          </div>
          <div className="relative w-full xl:w-72">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exams" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="grid min-h-64 place-items-center text-center"><div><LuGraduationCap className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-semibold">No exams found</p><p className="text-sm text-muted-foreground">Try another status or search.</p></div></CardContent></Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((exam) => {
              const activeAttempt = inProgress(exam._id);
              const result = latestCompleted(exam._id);
              const status = displayStatus(exam);
              const used = attemptsFor(exam._id).length;
              const remaining = Math.max(0, Math.max(1, exam.attempts || 1) - used);
              return (
                <Card key={exam._id} className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4 border-b bg-muted/25 p-5">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LuGraduationCap className="h-6 w-6" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold">{exam.title}</h2>
                          <Badge
                            variant="outline"
                            className={status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'in_progress' ? 'border-primary/30 bg-primary/10 text-primary' : ''}
                          >
                            {status === 'in_progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{exam.course?.title || 'General exam'}{exam.startDate ? ` · ${new Date(exam.startDate).toLocaleString()}` : ''}</p>
                        {exam.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{htmlToPlainText(exam.description)}</p>}
                      </div>
                    </div>

                    {result ? (
                      <div className="flex items-center gap-4 bg-emerald-50/50 p-5">
                        <div className="text-3xl font-black text-emerald-700">{Number(result.percentage || 0).toFixed(1)}%</div>
                        <div>
                          <p className="font-semibold">Your result · {result.score}/{exam.totalMarks}</p>
                          <p className="text-sm text-muted-foreground">{result.passed ? 'Passed' : 'Not passed'} · {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'Completed'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 divide-x border-b">
                        <div className="p-3 text-center"><p className="font-bold">{exam.questionCount || '—'}</p><p className="text-[11px] text-muted-foreground">Questions</p></div>
                        <div className="p-3 text-center"><p className="font-bold">{exam.totalMarks}</p><p className="text-[11px] text-muted-foreground">Marks</p></div>
                        <div className="p-3 text-center"><p className="font-bold">{formatDuration(exam.duration)}</p><p className="text-[11px] text-muted-foreground">Duration</p></div>
                        <div className="p-3 text-center"><p className="font-bold">{remaining}</p><p className="text-[11px] text-muted-foreground">Attempts left</p></div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 p-4">
                      {activeAttempt && (
                        <Button onClick={() => router.push(`/student/exams/${exam._id}/take`)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <LuCirclePlay className="mr-2 h-4 w-4" />Continue
                          {typeof activeAttempt.remainingSeconds === 'number' && <span className="ml-2 text-xs opacity-80"><LuTimer className="mr-1 inline h-3 w-3" />{formatRemaining(activeAttempt.remainingSeconds)}</span>}
                        </Button>
                      )}
                      {canStart(exam) && (
                        <Button onClick={() => router.push(`/student/exams/${exam._id}/take`)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {result ? <LuRotateCcw className="mr-2 h-4 w-4" /> : <LuCirclePlay className="mr-2 h-4 w-4" />}
                          {result ? 'Reattempt' : 'Start exam'}
                        </Button>
                      )}
                      {result && (
                        <Button variant="outline" onClick={() => router.push(`/student/exams/${exam._id}/results`)}>
                          <LuEye className="mr-2 h-4 w-4" />View full result
                        </Button>
                      )}
                      {!activeAttempt && !result && !canStart(exam) && (
                        <span className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                          {status === 'upcoming' ? <LuCalendarDays className="h-4 w-4" /> : <LuClock3 className="h-4 w-4" />}
                          {status === 'upcoming' ? 'Opens on the scheduled date' : status === 'expired' ? 'Exam window closed' : 'Not currently available'}
                        </span>
                      )}
                      {result && <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><LuFileCheck2 className="h-4 w-4" />{used} of {Math.max(1, exam.attempts || 1)} attempts used</span>}
                      {result?.passed && <LuCheck className="ml-auto h-5 w-5 text-emerald-600" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </StudentRoleShell>
  );
}
