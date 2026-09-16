"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AttractiveTextarea } from "@/components/ui/attractive-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResourceBrowseSkeleton } from "@/components/resources/ResourceBrowseSkeleton";
import { ResourcePageContainer } from "@/components/resources/ResourcePageContainer";
import { ResourceFreemiumBanner } from "@/components/resources/ResourceFreemiumBanner";
import { ResourceGradePills } from "@/components/resources/ResourceGradeSubjectFilters";
import { testYourselfService } from "@/services/testYourselfService";
import { testYourselfTestsService } from "@/services/testYourselfTestsService";
import { MathText } from "@/components/ui/MathText";
import {
  DEFAULT_RESOURCE_ACCESS,
  TEST_YOURSELF_ENROLLED_LIMIT,
  TEST_YOURSELF_FREE_LIMIT,
} from "@/lib/resources/access";
import {
  listPublicTestYourselfHistory,
  pushPublicTestYourselfHistory,
  type PublicTestYourselfHistoryItem,
} from "@/lib/resources/testYourselfHistory";
import { type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import type { ResourceCenterAccess } from "@/types/resourceAccess";
import type {
  TestYourselfAttemptMode,
  TestYourselfCheckResult,
  TestYourselfQuestion,
  TestYourselfSubjectCard,
} from "@/types/testYourself";
import { LuArrowLeft, LuSparkles } from "react-icons/lu";

type TestYourselfBrowseClientProps = {
  context: "public" | "student";
  showPageHeader?: boolean;
};

type View = "browse" | "quiz" | "results";

const DEFAULT_GRADE: BatchGrade = "O";
const ALL_TOPICS = "__all__";

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

export function TestYourselfBrowseClient({
  context,
  showPageHeader = true,
}: TestYourselfBrowseClientProps) {
  const [view, setView] = useState<View>("browse");
  const [subjects, setSubjects] = useState<TestYourselfSubjectCard[]>([]);
  const [access, setAccess] = useState<ResourceCenterAccess>(DEFAULT_RESOURCE_ACCESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<BatchGrade>(DEFAULT_GRADE);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);

  const [questions, setQuestions] = useState<TestYourselfQuestion[]>([]);
  const [poolSize, setPoolSize] = useState(0);
  const [sampleSize, setSampleSize] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<TestYourselfCheckResult[]>([]);
  const [score, setScore] = useState(0);
  const [enrollHref, setEnrollHref] = useState("/enroll");
  const [publicHistory, setPublicHistory] = useState<PublicTestYourselfHistoryItem[]>([]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("grade", gradeFilter);
      const { res, json } = await testYourselfService.browseCatalog(params.toString());
      if (!res.ok) {
        setError(json.error || "Could not load practice subjects");
        setSubjects([]);
        setSubjectFilter("");
        return;
      }
      const nextSubjects = json.data?.subjects ?? [];
      setSubjects(nextSubjects);
      setAccess(json.data?.access ?? DEFAULT_RESOURCE_ACCESS);
    } catch {
      setError("Could not load practice subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [gradeFilter]);

  const selectGrade = (grade: BatchGrade) => {
    if (grade === gradeFilter) return;
    setGradeFilter(grade);
    setSubjectFilter("");
    setSelectedTopic(ALL_TOPICS);
  };

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    setPublicHistory(listPublicTestYourselfHistory());
  }, []);

  const subjectNames = useMemo(
    () => [...new Set(subjects.map((s) => s.subject))],
    [subjects],
  );

  const activeSubject = useMemo(() => {
    if (!subjectFilter) return null;
    return (
      subjects.find((s) => s.subject === subjectFilter) ||
      subjects.find((s) => s.name === subjectFilter) ||
      null
    );
  }, [subjects, subjectFilter]);

  useEffect(() => {
    if (!activeSubject) {
      setEnrollHref("/enroll");
      return;
    }
    if (activeSubject.courseId) {
      setEnrollHref(`/enroll/course/${activeSubject.courseId}`);
      return;
    }
    void testYourselfTestsService
      .resolveEnrollUrl(activeSubject.subject)
      .then(({ json }) => setEnrollHref(json.data?.url || "/enroll"))
      .catch(() => setEnrollHref("/enroll"));
  }, [activeSubject]);

  useEffect(() => {
    setSelectedTopic(ALL_TOPICS);
  }, [subjectFilter]);

  const mode: TestYourselfAttemptMode =
    selectedTopic && selectedTopic !== ALL_TOPICS ? "topic" : "full";

  const startAttempt = async () => {
    if (!activeSubject) {
      setError("Select a subject to continue");
      return;
    }

    setQuizLoading(true);
    setError(null);
    try {
      const { res, json } = await testYourselfService.loadQuestions({
        subject: activeSubject.subject,
        mode,
        topic: mode === "topic" ? selectedTopic : undefined,
        difficulty: "all",
      });
      if (!res.ok) {
        setError(json.error || "Could not load questions");
        return;
      }

      const loaded = json.data?.questions ?? [];
      setQuestions(loaded);
      setPoolSize(json.data?.access?.poolSize ?? loaded.length);
      setSampleSize(json.data?.access?.sampleSize ?? loaded.length);
      if (json.data?.access) {
        setAccess((prev) => ({
          ...prev,
          fullAccess: json.data!.access!.fullAccess,
          freeLimit: json.data!.access!.freeLimit,
          enrolledLimit: json.data!.access!.enrolledLimit,
        }));
      }
      setSelections({});
      setCurrentIndex(0);
      setResults([]);
      setScore(0);
      setView("quiz");
    } catch {
      setError("Could not start attempt");
    } finally {
      setQuizLoading(false);
    }
  };

  const current = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;

  const submitAttempt = async () => {
    if (!activeSubject || !questions.length) return;
    const answers = questions
      .map((q) => {
        const sel = selections[q._id];
        if (sel === undefined) return null;
        if (typeof sel === "number") {
          return { questionId: q._id, optionIndex: sel };
        }
        return { questionId: q._id, textAnswer: String(sel) };
      })
      .filter(Boolean) as { questionId: string; optionIndex?: number; textAnswer?: string }[];

    if (!answers.length) {
      setError("Answer at least one question before submitting");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { res, json } = await testYourselfService.checkAnswers({
        subject: activeSubject.subject,
        mode,
        topic: mode === "topic" ? selectedTopic : undefined,
        answers,
      });
      if (!res.ok) {
        setError(json.error || "Could not submit answers");
        return;
      }
      const nextScore = json.data?.score ?? 0;
      const nextTotal = json.data?.total ?? answers.length;
      setResults(json.data?.results ?? []);
      setScore(nextScore);
      setView("results");

      pushPublicTestYourselfHistory({
        subject: activeSubject.subject,
        topic: mode === "topic" ? selectedTopic : undefined,
        mode,
        score: nextScore,
        total: nextTotal,
      });
      setPublicHistory(listPublicTestYourselfHistory());
    } catch {
      setError("Could not submit answers");
    } finally {
      setSubmitting(false);
    }
  };

  const backToBrowse = () => {
    setView("browse");
    setQuestions([]);
    setError(null);
  };

  const attemptLabel = access.fullAccess
    ? `${activeSubject?.enrolledLimit ?? access.enrolledLimit ?? TEST_YOURSELF_ENROLLED_LIMIT} questions (random each time)`
    : `${activeSubject?.freeLimit ?? access.freeLimit ?? TEST_YOURSELF_FREE_LIMIT} free preview questions`;

  return (
    <ResourcePageContainer>
      {view === "browse" ? (
        <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl flex-col justify-center py-6 md:min-h-[calc(100vh-8rem)]">
          {showPageHeader ? (
            <header className="mb-8 text-center md:mb-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LuSparkles className="h-7 w-7" />
              </div>
              <h1 className="font-[family-name:var(--font-headline)] text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Test Yourself
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Pick a subject, optionally narrow to a topic, then start a short practice
                attempt. Questions are drawn from the platform bank so every run feels fresh.
              </p>
            </header>
          ) : null}

          {!access.fullAccess ? (
            <div className="mb-6">
              <ResourceFreemiumBanner
                access={access}
                context={context}
                variant="test-yourself"
              />
            </div>
          ) : null}

          <Card className="space-y-6 border-slate-200 p-6 shadow-sm md:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Class / grade</p>
              <ResourceGradePills value={gradeFilter} onChange={selectGrade} />
            </div>

            {loading ? (
              <ResourceBrowseSkeleton showPageHeader={false} variant="list" />
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Select the subject you want to test
                  </p>
                  <Select
                    value={subjectFilter || undefined}
                    onValueChange={(value) => {
                      setSubjectFilter(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue
                        placeholder={
                          subjectNames.length
                            ? "Choose a subject…"
                            : `No subjects for ${formatGradeLabel(gradeFilter)}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={`${s.subject}-${s.grade || "none"}`} value={s.subject}>
                          {s.name || s.subject}
                          {s.questionCount ? ` · ${s.questionCount} questions` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Topics <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <Select
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                    disabled={!activeSubject}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="All topics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TOPICS}>All topics (full subject)</SelectItem>
                      {(activeSubject?.topics || []).map((t) => (
                        <SelectItem key={t.topic} value={t.topic}>
                          {t.name}
                          {t.questionCount ? ` (${t.questionCount})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeSubject ? (
                    <p className="text-xs text-muted-foreground">{attemptLabel}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Leave topics on “All topics” for a full-subject mix, or pick one chapter.
                    </p>
                  )}
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button
                  className="h-12 w-full text-base"
                  disabled={!activeSubject || quizLoading || !subjectNames.length}
                  onClick={() => void startAttempt()}
                >
                  {quizLoading ? "Preparing…" : "Start test"}
                </Button>
              </>
            )}
          </Card>

          {publicHistory.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border px-4 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent attempts
              </p>
              <ul className="space-y-2">
                {publicHistory.slice(0, 4).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">
                      {h.subject}
                      {h.topic ? ` · ${h.topic}` : " · Full subject"}
                    </span>
                    <Badge variant="secondary">
                      {h.score}/{h.total}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {view === "quiz" && current ? (
        <div className="mx-auto max-w-2xl space-y-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button size="sm" variant="ghost" onClick={backToBrowse}>
              <LuArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
              {poolSize > questions.length ? ` · sampled from ${poolSize}` : ""}
            </p>
          </div>

          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{current.topic}</Badge>
              <Badge variant="secondary">
                {DIFFICULTY_LABEL[current.difficulty] || "—"}
              </Badge>
            </div>
            <MathText
              as="p"
              className="text-base font-medium leading-relaxed"
              text={current.questionText}
            />
            {current.hasDiagram && current.diagramUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.diagramUrl}
                alt="Question diagram"
                className="max-h-64 rounded-md border object-contain"
              />
            ) : null}

            {current.questionFormat === "mcq" ? (
              <div className="space-y-2">
                {current.options.map((opt) => {
                  const selected = selections[current._id] === opt.index;
                  return (
                    <button
                      key={opt.index}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/40"
                      }`}
                      onClick={() =>
                        setSelections((prev) => ({
                          ...prev,
                          [current._id]: opt.index,
                        }))
                      }
                    >
                      <MathText text={opt.text} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <AttractiveTextarea
                value={String(selections[current._id] ?? "")}
                onChange={(e) =>
                  setSelections((prev) => ({
                    ...prev,
                    [current._id]: e.target.value,
                  }))
                }
                placeholder="Write your answer…"
                rows={4}
              />
            )}
          </Card>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            {!isLast ? (
              <Button onClick={() => setCurrentIndex((i) => i + 1)}>Next</Button>
            ) : (
              <Button disabled={submitting} onClick={() => void submitAttempt()}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Showing {sampleSize} question{sampleSize === 1 ? "" : "s"} this attempt
            {!access.fullAccess ? " (free preview)" : ""}.
          </p>
        </div>
      ) : null}

      {view === "results" && activeSubject ? (
        <div className="mx-auto max-w-2xl space-y-4 py-4">
          <Card className="space-y-3 p-5 text-center">
            <h2 className="text-xl font-semibold">Attempt complete</h2>
            <p className="text-3xl font-bold">
              {score}/{results.length || sampleSize}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeSubject.subject}
              {mode === "topic" && selectedTopic !== ALL_TOPICS
                ? ` · ${selectedTopic}`
                : " · Full subject"}
            </p>
            {!access.fullAccess ? (
              <p className="text-sm">
                Enroll for larger random sets each attempt.{" "}
                <Link href={enrollHref} className="font-medium text-primary underline">
                  View courses
                </Link>
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button variant="outline" onClick={backToBrowse}>
                Change subject
              </Button>
              <Button
                onClick={() => {
                  setQuestions([]);
                  void startAttempt();
                }}
              >
                Attempt again
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {results.map((r, idx) => {
              const q = questions.find((item) => item._id === r.questionId);
              return (
                <Card key={r.questionId} className="space-y-2 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Q{idx + 1}</span>
                    <Badge variant={r.correct || r.selfCheck ? "secondary" : "destructive"}>
                      {r.selfCheck ? "Self-check" : r.correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  {q ? <MathText as="p" text={q.questionText} /> : null}
                  {r.explanation ? (
                    <p className="text-muted-foreground">
                      <MathText text={r.explanation} />
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </ResourcePageContainer>
  );
}
