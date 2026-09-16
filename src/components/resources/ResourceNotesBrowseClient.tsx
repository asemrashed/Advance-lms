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
import { ResourceBrowseActions } from "@/components/resources/ResourceBrowseActions";
import { triggerBrowserDownload } from "@/lib/triggerBrowserDownload";
import { ResourceBrowseSkeleton } from "@/components/resources/ResourceBrowseSkeleton";
import { ResourceFreemiumBanner } from "@/components/resources/ResourceFreemiumBanner";
import { ResourcePageContainer } from "@/components/resources/ResourcePageContainer";
import { ResourcePdfViewerModal } from "@/components/resources/ResourcePdfViewerModal";
import {
  ResourceGradePills,
  ResourceSubjectSelect,
} from "@/components/resources/ResourceGradeSubjectFilters";
import { resourceNotesService } from "@/services/resourceNotesService";
import { DEFAULT_RESOURCE_ACCESS } from "@/lib/resources/access";
import { type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import type { ResourceCenterAccess } from "@/types/resourceAccess";
import type { ResourceNoteRow } from "@/types/resourceNote";
import { LuFileText, LuSearch } from "react-icons/lu";

type ResourceNotesBrowseClientProps = {
  context: "public" | "student";
  showPageHeader?: boolean;
};

const DEFAULT_GRADE: BatchGrade = "O";

export function ResourceNotesBrowseClient({
  context,
  showPageHeader = true,
}: ResourceNotesBrowseClientProps) {
  const [notes, setNotes] = useState<ResourceNoteRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<BatchGrade>(DEFAULT_GRADE);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState("all");
  const [access, setAccess] = useState<ResourceCenterAccess>(DEFAULT_RESOURCE_ACCESS);
  const [lockedCount, setLockedCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("grade", gradeFilter);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (topicFilter !== "all") params.set("topic", topicFilter);
      const { res, json } = await resourceNotesService.browsePublic(
        params.toString(),
      );
      if (!res.ok) {
        setError(json.error || "Could not load notes");
        setNotes([]);
        setSubjects([]);
        setTopics([]);
        return;
      }
      const nextSubjects = json.data?.subjects ?? [];
      setSubjects(nextSubjects);
      setTopics(json.data?.topics ?? []);
      setAccess(json.data?.access ?? DEFAULT_RESOURCE_ACCESS);
      setLockedCount(json.data?.stats?.locked ?? 0);

      if (nextSubjects.length === 0) {
        setSubjectFilter(null);
        setNotes([]);
        return;
      }
      if (!subjectFilter || !nextSubjects.includes(subjectFilter)) {
        setSubjectFilter(nextSubjects[0]);
        return;
      }

      setNotes(json.data?.notes ?? []);
    } catch {
      setError("Could not load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, gradeFilter, topicFilter]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const handleRead = async (note: ResourceNoteRow) => {
    setReadingId(note._id);
    setViewerTitle(note.title);
    setViewerUrl(null);
    setViewerError(null);
    setViewerLoading(true);
    setViewerOpen(true);

    try {
      const { res, json } = await resourceNotesService.fetchViewUrl(note._id);
      if (!res.ok || !json.data?.url) {
        setViewerError(json.error || "Could not open this note");
        return;
      }
      setViewerUrl(json.data.url);
    } catch {
      setViewerError("Could not open this note");
    } finally {
      setViewerLoading(false);
      setReadingId(null);
    }
  };

  const handleDownload = async (note: ResourceNoteRow) => {
    setDownloadingId(note._id);
    try {
      const { res, json } = await resourceNotesService.fetchViewUrl(note._id);
      if (!res.ok || !json.data?.url) {
        throw new Error(json.error || "Failed to get note URL");
      }
      triggerBrowserDownload(String(json.data.url), `${note.title}.pdf`);
    } catch (error) {
      console.error("Failed to download note:", error);
      alert("Failed to download note. Please try again later.");
    } finally {
      setDownloadingId(null);
    }
  };

  const groupedNotes = notes.reduce<Record<string, ResourceNoteRow[]>>(
    (groups, note) => {
      const topic = note.topic?.trim() || "General";
      (groups[topic] ||= []).push(note);
      return groups;
    },
    {},
  );

  const orderedTopicEntries = (() => {
    const entries = Object.entries(groupedNotes);
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

  if (loading && notes.length === 0 && !subjectFilter) {
    return <ResourceBrowseSkeleton showPageHeader={showPageHeader} variant="list" />;
  }

  return (
    <ResourcePageContainer withPadding={showPageHeader}>
      {showPageHeader ? (
        <header className="mb-6">
          <h1 className="font-[family-name:var(--font-headline)] text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Notes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Subject and topic PDF notes for your studies.
          </p>
        </header>
      ) : null}

      <ResourceFreemiumBanner
        access={access}
        context={context}
        variant="notes"
        lockedCount={lockedCount}
      />

      <ResourceGradePills value={gradeFilter} onChange={selectGrade} />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
        <ResourceSubjectSelect
          subjects={subjects}
          value={subjectFilter}
          onChange={selectSubject}
          loading={loading}
          emptyLabel={`No subjects available for ${formatGradeLabel(gradeFilter)}.`}
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
            placeholder="Search notes..."
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

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No notes published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orderedTopicEntries.map(([topic, rows]) => (
            <section
              key={topic}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h2 className="font-bold text-slate-900">{topic}</h2>
                <span className="text-xs font-semibold text-slate-500">
                  {rows.length} note{rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((note) => (
                  <div
                    key={note._id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <LuFileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-950">
                        {note.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                        {note.description || `${note.subject} · ${note.topic}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{note.subject}</Badge>
                        {note.accessPolicy === "batch" ? (
                          <Badge variant="secondary">Course access</Badge>
                        ) : (
                          <Badge className="border-0 bg-primary/10 text-primary">
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ResourceBrowseActions
                      context={context}
                      canAccess={Boolean(note.canDownload)}
                      onDownload={() => void handleDownload(note)}
                      downloading={downloadingId === note._id}
                      onRead={() => void handleRead(note)}
                      reading={readingId === note._id}
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
