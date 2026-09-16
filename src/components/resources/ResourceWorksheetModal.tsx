"use client";

import { FormEvent, useEffect, useState } from "react";
import FormModal from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PDFUpload from "@/components/PDFUpload";
import {
  ResourceScopeFields,
  isResourceScopeComplete,
} from "@/components/resources/ResourceScopeFields";
import { WorksheetQuestionPicker } from "@/components/resources/WorksheetQuestionPicker";
import { resourceWorksheetsService } from "@/services/resourceWorksheetsService";
import type {
  CreateResourceWorksheetDto,
  GenerateResourceWorksheetDto,
  ResourceWorksheetAccessPolicy,
  ResourceWorksheetRow,
  UpdateResourceWorksheetDto,
} from "@/types/resourceWorksheet";
import { emptyResourceScope, toResourceScopePayload, type ResourceScopeValue } from "@/types/resourceScope";
import {
  ResourceSubjectFields,
  type ResourceSubjectValue,
} from "@/components/resources/ResourceSubjectFields";

type BuildMode = "upload" | "course_qb";

type ResourceWorksheetModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  worksheet?: ResourceWorksheetRow | null;
  role?: "admin" | "instructor";
  /** Instructor materials — force batch access, lock course. */
  courseScoped?: boolean;
  lockedCourse?: {
    courseId: string;
    courseKind: "live" | "recorded";
    batchId?: string;
    subjectName?: string;
    grade?: string;
    chapterId?: string;
    chapterTitle?: string;
    lessonId?: string;
  };
};

type WorksheetFormState = ResourceScopeValue & ResourceSubjectValue & {
  title: string;
  pdfUrl: string;
  pdfPublicId?: string;
  marksPdfUrl?: string;
  marksPdfPublicId?: string;
  description?: string;
  isActive?: boolean;
  accessPolicy?: ResourceWorksheetAccessPolicy;
};

const emptyForm: WorksheetFormState = {
  ...emptyResourceScope,
  title: "",
  pdfUrl: "",
  pdfPublicId: "",
  marksPdfUrl: "",
  marksPdfPublicId: "",
  description: "",
  isActive: true,
  accessPolicy: "public",
};

export function ResourceWorksheetModal({
  open,
  onClose,
  onSuccess,
  worksheet,
  role = "admin",
  courseScoped = false,
  lockedCourse,
}: ResourceWorksheetModalProps) {
  const isEdit = Boolean(worksheet?._id);
  const subjectScoped = role === "admin" && !courseScoped;
  const [buildMode, setBuildMode] = useState<BuildMode>("course_qb");
  const [form, setForm] = useState<WorksheetFormState>(emptyForm);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && worksheet) {
      setBuildMode(worksheet.sourceType === "course_qb" ? "course_qb" : "upload");
      setForm({
        courseKind: worksheet.batchId ? "live" : "recorded",
        chapterId: worksheet.chapterId,
        lessonId: worksheet.lessonId,
        courseId: worksheet.courseId,
        batchId: worksheet.batchId,
        subjectName: worksheet.subject,
        subjectId: worksheet.subjectId,
        subjectCode: worksheet.subjectCode,
        chapterName: worksheet.topic,
        grade: worksheet.grade,
        title: worksheet.title,
        pdfUrl: worksheet.pdfUrl || "",
        pdfPublicId: worksheet.pdfPublicId || "",
        marksPdfUrl: worksheet.marksPdfUrl || "",
        marksPdfPublicId: worksheet.marksPdfPublicId || "",
        description: worksheet.description || "",
        isActive: worksheet.isActive ?? true,
        accessPolicy: courseScoped ? "batch" : worksheet.accessPolicy ?? "public",
      });
      setQuestionIds((worksheet.questionIds ?? []).map(String));
    } else {
      setBuildMode("course_qb");
      setForm({
        ...emptyForm,
        ...(lockedCourse
          ? {
              courseId: lockedCourse.courseId,
              courseKind: lockedCourse.courseKind,
              batchId: lockedCourse.batchId,
              subjectName: lockedCourse.subjectName,
              grade: lockedCourse.grade,
              chapterId: lockedCourse.chapterId,
              chapterName: lockedCourse.chapterTitle,
              lessonId: lockedCourse.lessonId,
            }
          : {}),
        accessPolicy: courseScoped ? "batch" : "public",
      });
      setQuestionIds([]);
      setIncludeAnswers(false);
    }
    setError(null);
  }, [isEdit, worksheet, open, courseScoped, lockedCourse]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.title.trim()) {
        setError("Title is required.");
        setLoading(false);
        return;
      }

      if (buildMode === "upload" && !form.pdfUrl.trim()) {
        setError("Upload a worksheet PDF.");
        setLoading(false);
        return;
      }

      if (buildMode === "course_qb" && questionIds.length === 0) {
        setError("Select at least one question from the course question bank.");
        setLoading(false);
        return;
      }

      if (subjectScoped && (!form.grade || !form.subjectId || !form.chapterName)) {
        setError("Select class, then subject and chapter.");
        setLoading(false);
        return;
      }

      if (!subjectScoped && !isResourceScopeComplete(form)) {
        setError("Select course, chapter, and lesson.");
        setLoading(false);
        return;
      }

      const scope = subjectScoped ? null : toResourceScopePayload(form);
      if (!subjectScoped && !scope) {
        setError("Complete the course hierarchy before saving.");
        setLoading(false);
        return;
      }

      const scopePayload = subjectScoped
        ? {
            scopeType: "subject" as const,
            subjectId: form.subjectId,
            subject: form.subjectName,
            subjectCode: form.subjectCode,
            chapter: form.chapterName,
            grade: form.grade,
          }
        : scope!;

      let res: Response;
      let json: { success?: boolean; error?: string };

      if (isEdit) {
        if (buildMode === "course_qb") {
          const payload: UpdateResourceWorksheetDto = {
            ...scopePayload,
            title: form.title.trim(),
            questionIds,
            includeAnswers,
            regenerateFromQuestions: true,
            description: form.description,
            isActive: form.isActive,
            accessPolicy: courseScoped
              ? "batch"
              : subjectScoped
                ? "public"
                : form.accessPolicy,
          };
          ({ res, json } = await resourceWorksheetsService.updateWorksheet(
            worksheet!._id,
            payload,
          ));
        } else {
          const payload: UpdateResourceWorksheetDto = {
            ...scopePayload,
            title: form.title.trim(),
            pdfUrl: form.pdfUrl.trim(),
            pdfPublicId: form.pdfPublicId,
            marksPdfUrl: form.marksPdfUrl?.trim() || undefined,
            marksPdfPublicId: form.marksPdfPublicId || undefined,
            description: form.description,
            isActive: form.isActive,
            accessPolicy: courseScoped
              ? "batch"
              : subjectScoped
                ? "public"
                : form.accessPolicy,
          };
          ({ res, json } = await resourceWorksheetsService.updateWorksheet(
            worksheet!._id,
            payload,
          ));
        }
      } else if (buildMode === "course_qb") {
        const generatePayload: GenerateResourceWorksheetDto = {
          ...scopePayload,
          title: form.title.trim(),
          questionIds,
          includeAnswers,
          description: form.description,
          isActive: form.isActive,
          accessPolicy: courseScoped
            ? "batch"
            : subjectScoped
              ? "public"
              : form.accessPolicy,
        };
        ({ res, json } = await resourceWorksheetsService.generateWorksheet(generatePayload));
      } else {
        const payload: CreateResourceWorksheetDto = {
          ...scopePayload,
          title: form.title.trim(),
          pdfUrl: form.pdfUrl.trim(),
          pdfPublicId: form.pdfPublicId,
          marksPdfUrl: form.marksPdfUrl?.trim() || undefined,
          marksPdfPublicId: form.marksPdfPublicId || undefined,
          description: form.description,
          isActive: form.isActive,
          accessPolicy: courseScoped
            ? "batch"
            : subjectScoped
              ? "public"
              : form.accessPolicy,
        };
        ({ res, json } = await resourceWorksheetsService.createWorksheet(payload));
      }

      if (!res.ok) {
        setError(json.error || "Failed to save worksheet");
        return;
      }

      onSuccess();
    } catch {
      setError("Failed to save worksheet");
    } finally {
      setLoading(false);
    }
  };

  const modeLocked = isEdit;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit worksheet" : "Build worksheet"}
      onSubmit={handleSubmit}
      loading={loading}
      submitText={
        isEdit
          ? buildMode === "course_qb"
            ? "Save & regenerate"
            : "Save changes"
          : buildMode === "course_qb"
            ? "Generate worksheet"
            : "Create worksheet"
      }
      size="2xl"
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {subjectScoped ? (
          <ResourceSubjectFields
            value={form}
            onChange={(subject, isUserAction) => {
              setForm((current) => {
                const subjectChanged =
                  isUserAction &&
                  subject.subjectId !== undefined &&
                  subject.subjectId !== current.subjectId;
                const chapterChanged =
                  isUserAction &&
                  subject.chapterName !== undefined &&
                  subject.chapterName !== current.chapterName;
                if (subjectChanged || chapterChanged) {
                  setQuestionIds([]);
                }
                return { ...current, ...subject };
              });
            }}
            requireChapter
          />
        ) : courseScoped && lockedCourse?.chapterId && lockedCourse?.lessonId ? (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Scoped to this lesson — questions are filtered by chapter / topic
            {[lockedCourse.subjectName, lockedCourse.chapterTitle]
              .filter(Boolean)
              .length
              ? ` (${[lockedCourse.subjectName, lockedCourse.chapterTitle]
                  .filter(Boolean)
                  .join(" · ")})`
              : ""}
            .
          </p>
        ) : (
        <ResourceScopeFields
          value={form}
          onChange={(scope) => {
            if (
              scope.chapterId !== form.chapterId ||
              scope.lessonId !== form.lessonId
            ) {
              setQuestionIds([]);
            }
            setForm((f) => ({
              ...f,
              ...scope,
              ...(lockedCourse
                ? {
                    courseId: lockedCourse.courseId,
                    courseKind: lockedCourse.courseKind,
                    batchId: lockedCourse.batchId,
                  }
                : {}),
            }));
          }}
          lockCourse={Boolean(lockedCourse)}
        />
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Title</label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Functions practice sheet"
            required
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={buildMode === "course_qb" ? "default" : "outline"}
            disabled={modeLocked && buildMode !== "course_qb"}
            onClick={() => {
              if (!modeLocked) setBuildMode("course_qb");
            }}
          >
            From question bank
          </Button>
          <Button
            type="button"
            size="sm"
            variant={buildMode === "upload" ? "default" : "outline"}
            disabled={modeLocked && buildMode !== "upload"}
            onClick={() => {
              if (!modeLocked) setBuildMode("upload");
            }}
          >
            Upload PDF
          </Button>
        </div>

        {buildMode === "course_qb" ? (
          <>
            <WorksheetQuestionPicker
              role={role}
              batchScope={false}
              subject={subjectScoped ? form.subjectName : undefined}
              topic={subjectScoped ? form.chapterName : undefined}
              subjectLabel={
                subjectScoped
                  ? form.subjectName
                  : form.subjectName || lockedCourse?.subjectName
              }
              chapterLabel={
                subjectScoped
                  ? form.chapterName
                  : form.chapterName || lockedCourse?.chapterTitle
              }
              courseId={form.courseId}
              chapterId={form.chapterId}
              selectedIds={questionIds}
              onChange={setQuestionIds}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAnswers}
                onChange={(e) => setIncludeAnswers(e.target.checked)}
              />
              Include answer key at end of PDF
            </label>
            {isEdit && form.pdfUrl ? (
              <p className="text-xs text-muted-foreground">
                Current PDF stays until you save; saving regenerates from the selected questions.{" "}
                <a
                  href={form.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Preview current PDF
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Worksheet PDF</p>
              <PDFUpload
                currentPDF={form.pdfUrl || null}
                folder="resources/worksheets"
                description={form.title}
                onPDFChange={(url, publicId) =>
                  setForm((f) => ({ ...f, pdfUrl: url, pdfPublicId: publicId }))
                }
                onPDFRemove={() =>
                  setForm((f) => ({ ...f, pdfUrl: "", pdfPublicId: "" }))
                }
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Marks Schema (MS)
              </p>
              <PDFUpload
                currentPDF={form.marksPdfUrl || null}
                folder="resources/worksheets/ms"
                description={`${form.title} - MS`}
                onPDFChange={(url, publicId) =>
                  setForm((f) => ({
                    ...f,
                    marksPdfUrl: url,
                    marksPdfPublicId: publicId,
                  }))
                }
                onPDFRemove={() =>
                  setForm((f) => ({
                    ...f,
                    marksPdfUrl: "",
                    marksPdfPublicId: "",
                  }))
                }
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Description (optional)</label>
          <Input
            value={form.description || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        {courseScoped ? (
          <p className="text-xs text-muted-foreground">
            Access: course students only (not published to the public Resource Center).
          </p>
        ) : subjectScoped ? (
          <p className="text-xs text-muted-foreground">
            Access: public Resource Center (subject worksheets are not tied to a
            course enrollment).
          </p>
        ) : (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Access</p>
            <Select
              value={form.accessPolicy || "public"}
              onValueChange={(value: "public" | "batch") =>
                setForm((f) => ({ ...f, accessPolicy: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="batch">Course enrollment required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.checked }))
            }
          />
          Active
        </label>
      </div>
    </FormModal>
  );
}
