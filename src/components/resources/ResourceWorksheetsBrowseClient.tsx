"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResourceWorksheetFileActions } from "@/components/resources/ResourceWorksheetFileActions";
import { ResourceBrowseSkeleton } from "@/components/resources/ResourceBrowseSkeleton";
import { ResourceFreemiumBanner } from "@/components/resources/ResourceFreemiumBanner";
import { ResourcePageContainer } from "@/components/resources/ResourcePageContainer";
import { ResourcePdfViewerModal } from "@/components/resources/ResourcePdfViewerModal";
import {
  ResourceGradePills,
  ResourceSubjectSelect,
} from "@/components/resources/ResourceGradeSubjectFilters";
import { resourceWorksheetsService } from "@/services/resourceWorksheetsService";
import { DEFAULT_RESOURCE_ACCESS } from "@/lib/resources/access";
import { type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import { triggerBrowserDownload } from "@/lib/triggerBrowserDownload";
import type { ResourceCenterAccess } from "@/types/resourceAccess";
import type { ResourceWorksheetFileType, ResourceWorksheetRow } from "@/types/resourceWorksheet";
import { LuFileText, LuSearch } from "react-icons/lu";

type ResourceWorksheetsBrowseClientProps = {
  context: "public" | "student";
  showPageHeader?: boolean;
};

const DEFAULT_GRADE: BatchGrade = "O";

export function ResourceWorksheetsBrowseClient({
  context,
  showPageHeader = true,
}: ResourceWorksheetsBrowseClientProps) {
  const [worksheets, setWorksheets] = useState<ResourceWorksheetRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<BatchGrade>(DEFAULT_GRADE);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState("all");
  const [topics, setTopics] = useState<string[]>([]);
  const [access, setAccess] = useState<ResourceCenterAccess>(DEFAULT_RESOURCE_ACCESS);
  const [lockedCount, setLockedCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);

  const groupedWorksheets = worksheets.reduce<Record<string, ResourceWorksheetRow[]>>(
    (groups, worksheet) => {
      const topic = worksheet.topic || "General";
      (groups[topic] ||= []).push(worksheet);
      return groups;
    },
    {},
  );

  const orderedTopicEntries = (() => {
    const entries = Object.entries(groupedWorksheets);
    if (!topics.length) return entries;
    const order = new Map(topics.map((t, i) => [t.trim().toLowerCase(), i]));
    return entries.sort((a, b) => {
      const ao = order.get(a[0].trim().toLowerCase());
      const bo = order.get(b[0].trim().toLowerCase());
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      return a[0].localeCompare(b[0]);
    });
  })();

  const selectGrade = (grade: BatchGrade) => {
    if (grade === gradeFilter) return;
    setGradeFilter(grade);
    setSubjectFilter(null);
    setTopicFilter("all");
    setSubjects([]);
    setTopics([]);
  };

  const selectSubject = (subject: string) => {
    if (subject === subjectFilter) return;
    setSubjectFilter(subject);
    setTopicFilter("all");
  };

  const fetchWorksheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("grade", gradeFilter);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (topicFilter !== "all") params.set("topic", topicFilter);
      const { res, json } = await resourceWorksheetsService.browsePublic(
        params.toString(),
      );
      if (!res.ok) {
        setError(json.error || "Could not load worksheets");
        setWorksheets([]);
        setSubjects([]);
        setTopics([]);
        return;
      }
      const nextSubjects = json.data?.subjects ?? [];
      setSubjects(nextSubjects);
      setTopics(json.data?.topics ?? []);
      setAccess(json.data?.access ?? DEFAULT_RESOURCE_ACCESS);
      setLockedCount(json.data?.stats?.locked ?? 0);

      // Pick first subject for this class when none is selected / selection is invalid
      if (nextSubjects.length === 0) {
        setSubjectFilter(null);
        setWorksheets([]);
        return;
      }
      if (!subjectFilter || !nextSubjects.includes(subjectFilter)) {
        setSubjectFilter(nextSubjects[0]);
        // Skip applying worksheet results until the subject-scoped fetch runs
        return;
      }

      setWorksheets(json.data?.worksheets ?? []);
    } catch {
      setError("Could not load worksheets");
      setWorksheets([]);
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, gradeFilter, topicFilter]);

  useEffect(() => {
    void fetchWorksheets();
  }, [fetchWorksheets]);

  const handleRead = async (
    row: ResourceWorksheetRow,
    type: ResourceWorksheetFileType = "worksheet",
  ) => {
    setReadingId(`${row._id}-${type}`);
    setViewerTitle(
      type === "marks_pdf" ? `${row.title} — Marks Schema` : row.title,
    );
    setViewerUrl(null);
    setViewerError(null);
    setViewerLoading(true);
    setViewerOpen(true);

    try {
      const { res, json } = await resourceWorksheetsService.fetchViewUrl(
        row._id,
        type,
      );
      if (!res.ok || !json.data?.url) {
        setViewerError(json.error || "Could not open this worksheet");
        return;
      }
      setViewerUrl(json.data.url);
    } catch {
      setViewerError("Could not open this worksheet");
    } finally {
      setViewerLoading(false);
      setReadingId(null);
    }
  };

  const handleDownload = async (
    row: ResourceWorksheetRow,
    type: ResourceWorksheetFileType = "worksheet",
  ) => {
    const key = `${row._id}-${type}-dl`;
    setReadingId(key);
    try {
      const { res, json } = await resourceWorksheetsService.fetchViewUrl(
        row._id,
        type,
      );
      if (!res.ok || !json.data?.url) {
        throw new Error(json.error || "Failed to get worksheet URL");
      }
      const suffix = type === "marks_pdf" ? "-MS" : "";
      triggerBrowserDownload(String(json.data.url), `${row.title}${suffix}.pdf`);
    } catch (error) {
      console.error("Failed to download worksheet:", error);
      alert("Failed to download worksheet. Please try again later.");
    } finally {
      setReadingId(null);
    }
  };

  if (loading && worksheets.length === 0 && !subjectFilter) {
    return <ResourceBrowseSkeleton showPageHeader={showPageHeader} variant="table" />;
  }

  return (
    <ResourcePageContainer withPadding={showPageHeader}>
      {showPageHeader ? (
        <header className="mb-6">
          <h1 className="font-[family-name:var(--font-headline)] text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Topical Worksheets
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Practice worksheets from the public resource library.
          </p>
        </header>
      ) : null}

      <ResourceFreemiumBanner
        access={access}
        context={context}
        variant="worksheets"
        lockedCount={lockedCount}
      />

      {context === "student" ? (
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Worksheets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Worksheets from the public resource library.
          </p>
        </div>
      ) : null}

      <ResourceGradePills
        value={gradeFilter}
        onChange={selectGrade}
        className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [&>button]:px-3 [&>button]:py-1.5 [&>button]:text-xs sm:[&>button]:px-4 sm:[&>button]:py-2 sm:[&>button]:text-sm"
      />

      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 sm:mb-6 sm:gap-3 sm:p-3 lg:flex-row lg:items-center">
        <ResourceSubjectSelect
          subjects={subjects}
          value={subjectFilter}
          onChange={selectSubject}
          loading={loading}
          emptyLabel={`No subjects available for ${formatGradeLabel(gradeFilter)}.`}
          triggerClassName="w-full lg:w-52"
        />
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search worksheets..."
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

      {worksheets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No worksheets published yet.
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orderedTopicEntries.map(([topic, rows]) => (
            <section key={topic} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-5 sm:py-3">
                <h2 className="min-w-0 truncate font-bold text-slate-900">{topic}</h2>
                <span className="shrink-0 text-[11px] font-semibold text-slate-500 sm:text-xs">
                  {rows.length} worksheet{rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <div
                    key={row._id}
                    className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
                        <LuFileText className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-950">{row.title}</h3>
                        {row.description ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                            {row.description}
                          </p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            {row.subject}
                          </Badge>
                          {row.scopeType === "subject" || (!row.courseId && !row.batchId) ? (
                            <Badge variant="outline">Topical</Badge>
                          ) : (
                            <Badge variant="outline" className="hidden sm:inline-flex">
                              {row.batchId || row.batch ? "Live course" : "Recorded course"}
                            </Badge>
                          )}
                          {row.accessPolicy === "batch" ? (
                            <Badge variant="secondary">Course access</Badge>
                          ) : (
                            <Badge className="border-0 bg-primary/10 text-primary">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ResourceWorksheetFileActions
                      row={row}
                      context={context}
                      canAccess={Boolean(row.canDownload)}
                      activeKey={readingId}
                      onView={(worksheet, type) => void handleRead(worksheet, type)}
                      onDownload={(worksheet, type) =>
                        void handleDownload(worksheet, type)
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ResourcePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={viewerTitle}
        pdfUrl={viewerUrl}
        loading={viewerLoading}
        error={viewerError}
        downloadHref={viewerUrl}
      />
    </ResourcePageContainer>
  );
}
