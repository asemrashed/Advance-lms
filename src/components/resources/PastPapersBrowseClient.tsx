"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResourceBrowseSkeleton } from "@/components/resources/ResourceBrowseSkeleton";
import { ResourcePageContainer } from "@/components/resources/ResourcePageContainer";
import { ResourcePdfViewerModal } from "@/components/resources/ResourcePdfViewerModal";
import {
  ResourceGradePills,
  ResourceSubjectSelect,
} from "@/components/resources/ResourceGradeSubjectFilters";
import { SearchableFilterSelect } from "@/components/ui/SearchableFilterSelect";
import {
  pastPapersPublicService,
  type PublicPastPaperFilters,
  type PublicPastPaperRow,
} from "@/services/pastPapersPublicService";
import type { PastPaperFileType } from "@/types/pastPaper";
import { type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import { triggerBrowserDownload } from "@/lib/triggerBrowserDownload";
import { LuBookOpen, LuDownload, LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";

type PastPapersBrowseClientProps = {
  context: "public" | "student" | "admin";
  showPageHeader?: boolean;
  manage?: boolean;
  refreshKey?: number;
  onAdd?: () => void;
  onEdit?: (paper: PublicPastPaperRow) => void;
  onDelete?: (paper: PublicPastPaperRow) => void;
};

const DEFAULT_GRADE: BatchGrade = "O";

function paperTitle(paper: PublicPastPaperRow): string {
  return `${paper.sessionName} ${paper.year} — ${paper.subject} (${paper.examType})`;
}

export function PastPapersBrowseClient({
  showPageHeader = true,
  manage = false,
  refreshKey = 0,
  onAdd,
  onEdit,
  onDelete,
}: PastPapersBrowseClientProps) {
  const [papers, setPapers] = useState<PublicPastPaperRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<PublicPastPaperFilters>({
    subjects: [],
    examTypes: [],
    years: [],
    sessionNames: [],
    courses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<BatchGrade>(DEFAULT_GRADE);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerDownloadHref, setViewerDownloadHref] = useState<string | null>(
    null,
  );
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);

  const selectGrade = (grade: BatchGrade) => {
    if (grade === gradeFilter) return;
    setGradeFilter(grade);
    setSubjectFilter(null);
    setYearFilter("all");
    setSessionFilter("all");
    setExamTypeFilter("all");
    setFilterOptions((prev) => ({ ...prev, subjects: [] }));
  };

  const selectSubject = (subject: string) => {
    if (subject === subjectFilter) return;
    setSubjectFilter(subject);
    setYearFilter("all");
    setSessionFilter("all");
    setExamTypeFilter("all");
  };

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("grade", gradeFilter);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (examTypeFilter !== "all") params.set("examType", examTypeFilter);
      if (sessionFilter !== "all") params.set("sessionName", sessionFilter);
      params.set("limit", "50");

      const { res, json } = await pastPapersPublicService.browse(
        params.toString(),
      );
      if (!res.ok) {
        setError(json.error || "Could not load past papers");
        setPapers([]);
        return;
      }

      const nextFilters = json.data?.filters ?? {
        subjects: [],
        examTypes: [],
        years: [],
        sessionNames: [],
        courses: [],
      };
      setFilterOptions(nextFilters);

      if (nextFilters.subjects.length === 0) {
        setSubjectFilter(null);
        setPapers([]);
        return;
      }
      if (!subjectFilter || !nextFilters.subjects.includes(subjectFilter)) {
        setSubjectFilter(nextFilters.subjects[0]);
        return;
      }

      setPapers(json.data?.pastPapers ?? []);
    } catch {
      setError("Could not load past papers");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    subjectFilter,
    gradeFilter,
    yearFilter,
    examTypeFilter,
    sessionFilter,
    refreshKey,
  ]);

  useEffect(() => {
    void fetchPapers();
  }, [fetchPapers]);

  const yearOptions = useMemo(
    () =>
      filterOptions.years.map((y) => ({
        value: String(y),
        label: String(y),
      })),
    [filterOptions.years],
  );

  const sessionOptions = useMemo(
    () =>
      filterOptions.sessionNames.map((s) => ({
        value: s,
        label: s,
      })),
    [filterOptions.sessionNames],
  );

  const variantOptions = useMemo(
    () =>
      filterOptions.examTypes.map((t) => ({
        value: t,
        label: t,
      })),
    [filterOptions.examTypes],
  );

  const handleView = async (
    paper: PublicPastPaperRow,
    type: PastPaperFileType = "question_paper",
  ) => {
    setReadingId(`${paper._id}-${type}`);
    setViewerTitle(paperTitle(paper));
    setViewerUrl(null);
    setViewerError(null);
    setViewerDownloadHref(null);
    setViewerLoading(true);
    setViewerOpen(true);

    try {
      const { res, json } = await pastPapersPublicService.fetchViewUrl(
        paper._id,
        type,
      );
      if (!res.ok || !json.data?.url) {
        setViewerError(json.error || "Could not open this paper");
        return;
      }
      const url = String(json.data.url);
      setViewerUrl(url);
      setViewerDownloadHref(url);
    } catch {
      setViewerError("Could not open this paper");
    } finally {
      setViewerLoading(false);
      setReadingId(null);
    }
  };

  const handleDownload = async (
    paper: PublicPastPaperRow,
    type: PastPaperFileType = "question_paper",
  ) => {
    const key = `${paper._id}-${type}-dl`;
    setReadingId(key);
    try {
      const { res, json } = await pastPapersPublicService.fetchViewUrl(
        paper._id,
        type,
      );
      if (!res.ok || !json.data?.url) {
        throw new Error(json.error || "Failed to get paper URL");
      }
      const label = type === "marks_pdf" ? "MS" : "QP";
      triggerBrowserDownload(
        String(json.data.url),
        `${paperTitle(paper)}-${label}.pdf`,
      );
    } catch (error) {
      console.error("Failed to download past paper:", error);
      alert("Failed to download. Please try again later.");
    } finally {
      setReadingId(null);
    }
  };

  const fileActions = (
    paper: PublicPastPaperRow,
    type: PastPaperFileType,
    label: string,
  ) => {
    const hasFile =
      type === "marks_pdf" ? paper.hasMarksPdf : paper.hasQuestionPaper;
    if (!hasFile) {
      return (
        <p className="text-xs text-muted-foreground">
          {label} unavailable
        </p>
      );
    }
    const viewKey = `${paper._id}-${type}`;
    const downloadKey = `${paper._id}-${type}-dl`;
    return (
      <div className="flex flex-1 items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 sm:flex-none"
          onClick={() => void handleView(paper, type)}
          disabled={readingId === viewKey}
        >
          <LuBookOpen className="mr-1 h-4 w-4" />
          {readingId === viewKey ? "Opening..." : `View ${label}`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={type === "marks_pdf" ? "secondary" : "default"}
          className="flex-1 sm:flex-none"
          onClick={() => void handleDownload(paper, type)}
          disabled={readingId === downloadKey}
        >
          <LuDownload className="mr-1 h-4 w-4" />
          {readingId === downloadKey ? "..." : label}
        </Button>
      </div>
    );
  };

  const manageActions = (paper: PublicPastPaperRow) => {
    if (!manage) return null;
    return (
      <div className="flex items-center justify-end gap-1.5">
        {onEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(paper)}
          >
            <LuPencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(paper)}
          >
            <LuTrash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        ) : null}
      </div>
    );
  };

  if (loading && papers.length === 0 && !subjectFilter) {
    return (
      <ResourceBrowseSkeleton showPageHeader={showPageHeader} variant="list" />
    );
  }

  return (
    <ResourcePageContainer withPadding={showPageHeader}>
      {showPageHeader ? (
        <header className="mb-6">
          <h1 className="font-[family-name:var(--font-headline)] text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Past Papers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Past exam question papers in PDF. Free for everyone to view and
            download.
          </p>
        </header>
      ) : null}

      {manage && onAdd ? (
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={onAdd}>
            <LuPlus className="mr-1 h-4 w-4" />
            Add Past Paper
          </Button>
        </div>
      ) : null}

      <ResourceGradePills value={gradeFilter} onChange={selectGrade} />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResourceSubjectSelect
            subjects={filterOptions.subjects}
            value={subjectFilter}
            onChange={selectSubject}
            loading={loading}
            emptyLabel={`No subjects available for ${formatGradeLabel(gradeFilter)}.`}
            triggerClassName="w-full"
          />
          <SearchableFilterSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions}
            allLabel="All years"
            placeholder="Year"
            searchPlaceholder="Search year…"
          />
          <SearchableFilterSelect
            value={sessionFilter}
            onChange={setSessionFilter}
            options={sessionOptions}
            allLabel="All sessions"
            placeholder="Session"
            searchPlaceholder="Search session…"
          />
          <SearchableFilterSelect
            value={examTypeFilter}
            onChange={setExamTypeFilter}
            options={variantOptions}
            allLabel="All variants"
            placeholder="Question variant"
            searchPlaceholder="Search variant…"
          />
        </div>
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search past papers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {papers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No past papers published yet.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {papers.map((paper) => (
              <article
                key={paper._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-950">
                      {paper.sessionName} {paper.year}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {paper.subject || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{paper.examType}</Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {fileActions(paper, "question_paper", "QP")}
                  {fileActions(paper, "marks_pdf", "MS")}
                </div>
                {manage ? <div className="mt-3">{manageActions(paper)}</div> : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Session</TableHead>
                  <TableHead className="font-semibold">Year</TableHead>
                  <TableHead className="font-semibold">Exam variant</TableHead>
                  <TableHead className="min-w-[140px] text-center font-semibold">
                    QP
                  </TableHead>
                  <TableHead className="min-w-[140px] text-center font-semibold">
                    MS
                  </TableHead>
                  {manage ? (
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper) => (
                  <TableRow key={paper._id}>
                    <TableCell className="font-medium">
                      {paper.subject || "—"}
                    </TableCell>
                    <TableCell>{paper.sessionName}</TableCell>
                    <TableCell>{paper.year}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {paper.examType}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {fileActions(paper, "question_paper", "QP")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {fileActions(paper, "marks_pdf", "MS")}
                      </div>
                    </TableCell>
                    {manage ? <TableCell>{manageActions(paper)}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ResourcePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={viewerTitle}
        pdfUrl={viewerUrl}
        loading={viewerLoading}
        error={viewerError}
        downloadHref={viewerDownloadHref}
      />
    </ResourcePageContainer>
  );
}
