'use client';

import { useEffect, useMemo, useState } from 'react';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import WelcomeSection from '@/components/WelcomeSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Assignment, AssignmentSubmission } from '@/types/assignment';
import { CourseProgressRow, getMyProgress } from '@/lib/api/progressClient';
import { studentAssignmentService } from '@/services/studentAssignmentService';
import { studentExamService } from '@/services/studentExamService';
import {
  LuBookOpenCheck,
  LuCheck,
  LuCircleAlert,
  LuClipboardCheck,
  LuGraduationCap,
  LuLayers3,
  LuTrendingUp,
} from 'react-icons/lu';

interface AttemptRow {
  _id: string;
  exam: { _id: string; title: string; totalMarks: number };
  status: 'in_progress' | 'completed' | 'pending_review' | 'abandoned';
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  createdAt: string;
  completedAt?: string;
}

type AssignmentRow = Assignment & { latestSubmission?: AssignmentSubmission };
type TrendPoint = { id: string; title: string; percentage: number; date: string; kind: 'Exam' | 'Assignment' };

function courseId(value: Assignment['course']) {
  return typeof value === 'string' ? value : value?._id || '';
}

function courseName(value: Assignment['course']) {
  return typeof value === 'string' ? 'Course' : value?.title || 'Course';
}

function topicName(assignment: Assignment) {
  if (assignment.chapter && typeof assignment.chapter !== 'string' && assignment.chapter.title) return assignment.chapter.title;
  if (assignment.lesson && typeof assignment.lesson !== 'string' && assignment.lesson.title) return assignment.lesson.title;
  return courseName(assignment.course);
}

function gradeFor(percentage: number | null) {
  if (percentage == null) return '—';
  if (percentage >= 90) return 'A*';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export default function StudentProgressPage() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgressRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [attemptData, assignmentResponse, progressData] = await Promise.all([
          studentExamService.getStudentExamAttempts(),
          studentAssignmentService.listAssignments(new URLSearchParams({ page: '1', limit: '100', sortBy: 'createdAt', sortOrder: 'desc' })),
          getMyProgress(),
        ]);
        const assignmentBody = await assignmentResponse.json();
        setAttempts((attemptData.attempts as AttemptRow[]) || []);
        setAssignments((assignmentBody.data?.assignments || assignmentBody.assignments || []) as AssignmentRow[]);
        setCourseProgress(progressData.data.progress || []);
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    courseProgress.forEach((row) => {
      const id = typeof row.course === 'string' ? row.course : row.course._id;
      const title = typeof row.course === 'string' ? 'Course' : row.course.title || 'Course';
      map.set(id, title);
    });
    assignments.forEach((assignment) => map.set(courseId(assignment.course), courseName(assignment.course)));
    return [...map.entries()].filter(([id]) => Boolean(id));
  }, [assignments, courseProgress]);

  const scopedAssignments = useMemo(
    () => selectedCourse === 'all' ? assignments : assignments.filter((assignment) => courseId(assignment.course) === selectedCourse),
    [assignments, selectedCourse],
  );
  const scopedCourses = useMemo(
    () => selectedCourse === 'all'
      ? courseProgress
      : courseProgress.filter((row) => (typeof row.course === 'string' ? row.course : row.course._id) === selectedCourse),
    [courseProgress, selectedCourse],
  );

  const gradedAssignments = useMemo(
    () => scopedAssignments.filter((assignment) => typeof assignment.latestSubmission?.percentageScore === 'number'),
    [scopedAssignments],
  );
  const completedExams = useMemo(
    () => selectedCourse === 'all'
      ? attempts.filter((attempt) => attempt.status === 'completed' && typeof attempt.percentage === 'number')
      : [],
    [attempts, selectedCourse],
  );

  const trend = useMemo<TrendPoint[]>(() => {
    const assignmentPoints = gradedAssignments.map((assignment) => ({
      id: assignment._id,
      title: assignment.title,
      percentage: Number(assignment.latestSubmission?.percentageScore || 0),
      date: assignment.latestSubmission?.gradedAt || assignment.latestSubmission?.submittedAt || assignment.updatedAt,
      kind: 'Assignment' as const,
    }));
    const examPoints = completedExams.map((attempt) => ({
      id: attempt._id,
      title: attempt.exam?.title || 'Exam',
      percentage: Number(attempt.percentage || 0),
      date: attempt.completedAt || attempt.createdAt,
      kind: 'Exam' as const,
    }));
    return [...assignmentPoints, ...examPoints]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-6);
  }, [completedExams, gradedAssignments]);

  const assessmentAverage = trend.length
    ? Math.round((trend.reduce((sum, point) => sum + point.percentage, 0) / trend.length) * 10) / 10
    : null;
  const courseAverage = scopedCourses.length
    ? Math.round(scopedCourses.reduce((sum, row) => sum + Number(row.progressPercentage || 0), 0) / scopedCourses.length)
    : null;
  const completedLessons = scopedCourses.reduce((sum, row) => sum + Number(row.completedLessons || 0), 0);
  const totalLessons = scopedCourses.reduce((sum, row) => sum + Number(row.totalLessons || 0), 0);

  const topics = useMemo(() => {
    const grouped = new Map<string, number[]>();
    gradedAssignments.forEach((assignment) => {
      const name = topicName(assignment);
      const values = grouped.get(name) || [];
      values.push(Number(assignment.latestSubmission?.percentageScore || 0));
      grouped.set(name, values);
    });
    return [...grouped.entries()]
      .map(([name, values]) => ({ name, percentage: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), assessments: values.length }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [gradedAssignments]);

  const strongest = topics.filter((topic) => topic.percentage >= 75).slice(0, 3);
  const focus = [...topics].sort((a, b) => a.percentage - b.percentage).filter((topic) => topic.percentage < 75).slice(0, 3);

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-3 sm:p-5">
        <WelcomeSection title="My Progress" description="Your performance across assessments, topics and course completion" />

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border bg-card p-3 shadow-sm">
          <button type="button" onClick={() => setSelectedCourse('all')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${selectedCourse === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>All courses</button>
          {courses.map(([id, title]) => (
            <button key={id} type="button" onClick={() => setSelectedCourse(id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${selectedCourse === id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{title}</button>
          ))}
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assessment average" value={assessmentAverage == null ? '—' : `${assessmentAverage}%`} detail={assessmentAverage == null ? 'No graded assessments yet' : `Grade ${gradeFor(assessmentAverage)}`} icon={<LuTrendingUp />} />
          <MetricCard label="Course completion" value={courseAverage == null ? '—' : `${courseAverage}%`} detail={totalLessons ? `${completedLessons} of ${totalLessons} lessons` : 'No lesson progress yet'} icon={<LuBookOpenCheck />} />
          <MetricCard label="Graded work" value={String(trend.length)} detail={`${gradedAssignments.length} assignments${selectedCourse === 'all' ? ` · ${completedExams.length} exams` : ''}`} icon={<LuClipboardCheck />} />
          <MetricCard label="Courses tracked" value={String(scopedCourses.length)} detail={`${scopedCourses.filter((row) => row.status === 'completed').length} completed`} icon={<LuGraduationCap />} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-lg">Grade trend <span className="ml-1 text-sm font-normal text-muted-foreground">Last {trend.length} graded assessments</span></CardTitle></CardHeader>
              <CardContent>
                {loading ? <div className="h-56 animate-pulse rounded-xl bg-muted" /> : trend.length === 0 ? (
                  <EmptyState text="Graded assignments and exams will build your trend." />
                ) : (
                  <div className="flex h-64 items-end gap-3 border-b border-l px-3 pt-8">
                    {trend.map((point) => (
                      <div key={`${point.kind}-${point.id}`} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
                        <span className="mb-1 text-xs font-bold">{point.percentage}%</span>
                        <div className="w-full max-w-16 rounded-t-md bg-primary transition-[height]" style={{ height: `${Math.max(8, point.percentage)}%` }} title={`${point.title}: ${point.percentage}%`} />
                        <span className="mt-2 w-full truncate text-center text-[10px] text-muted-foreground" title={point.title}>{point.title}</span>
                        <span className="text-[9px] text-muted-foreground">{point.kind}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-lg">Topic mastery <span className="ml-1 text-sm font-normal text-muted-foreground">Based on graded assignments with course, chapter, or lesson data</span></CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {topics.length === 0 ? <EmptyState text="Topic mastery appears when graded assignments include chapter or lesson data." /> : topics.map((topic) => (
                  <div key={topic.name} className="grid grid-cols-[minmax(90px,0.45fr)_minmax(120px,1fr)_48px] items-center gap-3">
                    <div><p className="truncate text-sm font-semibold">{topic.name}</p><p className="text-[10px] text-muted-foreground">{topic.assessments} graded</p></div>
                    <Progress value={topic.percentage} className="h-2.5" />
                    <span className="text-right text-sm font-bold">{topic.percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-lg">Course completion</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {scopedCourses.length === 0 ? <EmptyState text="No course completion records are available." /> : scopedCourses.map((row) => {
                  const title = typeof row.course === 'string' ? 'Course' : row.course.title || 'Course';
                  return (
                    <div key={row._id}>
                      <div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{title}</span><span className="text-sm font-bold">{row.progressPercentage}%</span></div>
                      <Progress value={row.progressPercentage} className="h-2" />
                      <p className="mt-1 text-xs text-muted-foreground">{row.completedLessons} of {row.totalLessons} lessons complete</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader><CardTitle className="text-lg">Strengths & focus areas</CardTitle></CardHeader>
              <CardContent>
                {topics.length === 0 ? <EmptyState text="More graded topic data is needed." /> : (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
                      <div className="flex flex-wrap gap-2">{strongest.length ? strongest.map((topic) => <Badge key={topic.name} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><LuCheck className="mr-1 h-3 w-3" />{topic.name}</Badge>) : <span className="text-sm text-muted-foreground">No topic is above 75% yet.</span>}</div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Focus next</p>
                      <div className="flex flex-wrap gap-2">{focus.length ? focus.map((topic) => <Badge key={topic.name} variant="outline" className="border-amber-300 bg-amber-50 text-amber-800"><LuCircleAlert className="mr-1 h-3 w-3" />{topic.name}</Badge>) : <span className="text-sm text-muted-foreground">No lower-scoring topic is currently identified.</span>}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </StudentRoleShell>
  );
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="grid min-h-28 place-items-center rounded-xl border border-dashed bg-muted/20 p-5 text-center text-sm text-muted-foreground"><div><LuLayers3 className="mx-auto mb-2 h-6 w-6" />{text}</div></div>;
}
