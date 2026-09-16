"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import { InstructorRoleShell } from "@/components/role-area/InstructorRoleShell";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmModal from "@/components/ui/confirm-modal";
import { ResourceWorksheetModal } from "@/components/resources/ResourceWorksheetModal";
import { ResourceWorksheetFileActions } from "@/components/resources/ResourceWorksheetFileActions";
import { ResourcePdfViewerModal } from "@/components/resources/ResourcePdfViewerModal";
import {
  ResourceGradePills,
  ResourceSubjectSelect,
} from "@/components/resources/ResourceGradeSubjectFilters";
import { resourceWorksheetsService } from "@/services/resourceWorksheetsService";
import type {
  ResourceWorksheetFileType,
  ResourceWorksheetRow,
} from "@/types/resourceWorksheet";
import { type BatchGrade } from "@/lib/batchGrades";
import { formatGradeLabel } from "@/lib/courseLabel";
import { triggerBrowserDownload } from "@/lib/triggerBrowserDownload";
import { LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";

const DEFAULT_GRADE: BatchGrade = "O";

type ResourceWorksheetsStaffClientProps = {
  role: "admin" | "instructor";
};

function Shell({ role, children }: { role: "admin" | "instructor"; children: ReactNode }) {
  if (role === "admin") {
    return (
      <AdminRoleShell>
        <AdminPageWrapper>{children}</AdminPageWrapper>
      </AdminRoleShell>
    );
  }
  return <InstructorRoleShell>{children}</InstructorRoleShell>;
}

function scopeLabel(row: ResourceWorksheetRow) {
  if (!row.courseId) return [row.subject, row.topic].filter(Boolean).join(" · ");
  const course =
    typeof row.course === "object" && row.course ? row.course.title : "Course";
  const chapter =
    typeof row.chapter === "object" && row.chapter ? row.chapter.title : "";
  const lesson =
    typeof row.lesson === "object" && row.lesson ? row.lesson.title : row.topic;
  const batch =
    typeof row.batch === "object" && row.batch ? row.batch.name : "";
  const kind = row.batchId || batch ? "Live" : "Recorded";
  const parts = [kind, course];
  if (batch) parts.push(batch);
  if (chapter) parts.push(chapter);
  if (lesson) parts.push(lesson);
  return parts.filter(Boolean).join(" · ");
}

export function ResourceWorksheetsStaffClient({ role }: ResourceWorksheetsStaffClientProps) {
  const [worksheets, setWorksheets] = useState<ResourceWorksheetRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<BatchGrade>(DEFAULT_GRADE);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ResourceWorksheetRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceWorksheetRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);

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
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search.trim()) params.set("search", search.trim());
      params.set("grade", gradeFilter);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (topicFilter !== "all") params.set("topic", topicFilter);
      const { res, json } = await resourceWorksheetsService.listStaff(
        params.toString(),
      );
      if (res.ok) {
        const nextSubjects = json.data?.subjects ?? [];
        setSubjects(nextSubjects);
        setTopics(json.data?.topics ?? []);
        if (nextSubjects.length === 0) {
          setSubjectFilter(null);
          setWorksheets([]);
          return;
        }
        if (!subjectFilter || !nextSubjects.includes(subjectFilter)) {
          setSubjectFilter(nextSubjects[0]);
          return;
        }
        setWorksheets(json.data?.worksheets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, gradeFilter, subjectFilter, topicFilter]);

  useEffect(() => {
    void fetchWorksheets();
  }, [fetchWorksheets]);

  const handleView = async (
    row: ResourceWorksheetRow,
    type: ResourceWorksheetFileType = "worksheet",
  ) => {
    setActiveFileKey(`${row._id}-${type}`);
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
      setActiveFileKey(null);
    }
  };

  const handleDownload = async (
    row: ResourceWorksheetRow,
    type: ResourceWorksheetFileType = "worksheet",
  ) => {
    const key = `${row._id}-${type}-dl`;
    setActiveFileKey(key);
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
      setActiveFileKey(null);
    }
  };

  return (
    <Shell role={role}>
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Topical worksheets</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Assemble worksheets from the course question bank or upload a PDF.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
          >
            <LuPlus className="mr-1 h-4 w-4" />
            Build worksheet
          </Button>
        </header>

        <ResourceGradePills value={gradeFilter} onChange={selectGrade} />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center">
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
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
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

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading worksheets...</p>
        ) : worksheets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            No worksheets yet. Click Build worksheet to create one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Access</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="min-w-[220px] px-4 py-3 font-semibold">Files</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {worksheets.map((row) => (
                  <tr key={row._id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{scopeLabel(row)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {row.sourceType === "course_qb" ? "QB" : "Upload"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {row.accessPolicy === "batch" ? "Course" : "Public"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ResourceWorksheetFileActions
                        row={row}
                        context="admin"
                        canAccess
                        activeKey={activeFileKey}
                        onView={(worksheet, type) => void handleView(worksheet, type)}
                        onDownload={(worksheet, type) =>
                          void handleDownload(worksheet, type)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(row);
                            setShowModal(true);
                          }}
                        >
                          <LuPencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResourceWorksheetModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setShowModal(false);
          setEditing(null);
          void fetchWorksheets();
        }}
        worksheet={editing}
        role={role}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            const { res } = await resourceWorksheetsService.deleteWorksheet(deleteTarget._id);
            if (res.ok) {
              setDeleteTarget(null);
              void fetchWorksheets();
            }
          } finally {
            setDeleting(false);
          }
        }}
        title="Delete worksheet?"
        description="This worksheet will be permanently removed from the resource library."
        confirmText="Delete"
        loading={deleting}
      />

      <ResourcePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={viewerTitle}
        pdfUrl={viewerUrl}
        loading={viewerLoading}
        error={viewerError}
        downloadHref={viewerUrl}
      />
    </Shell>
  );
}
