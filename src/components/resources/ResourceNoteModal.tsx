"use client";

import { FormEvent, useEffect, useState } from "react";
import FormModal from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PDFUpload from "@/components/PDFUpload";
import {
  ResourceScopeFields,
  isResourceScopeComplete,
} from "@/components/resources/ResourceScopeFields";
import type {
  CreateResourceNoteDto,
  ResourceNoteAccessPolicy,
  ResourceNoteRow,
} from "@/types/resourceNote";
import { emptyResourceScope, toResourceScopePayload, type ResourceScopeValue } from "@/types/resourceScope";
import { resourceNotesService } from "@/services/resourceNotesService";
import {
  ResourceSubjectFields,
  type ResourceSubjectValue,
} from "@/components/resources/ResourceSubjectFields";

type ResourceNoteModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  note?: ResourceNoteRow | null;
  role?: "admin" | "instructor";
  /** Instructor course materials — force batch access, lock course. */
  courseScoped?: boolean;
  lockedCourse?: {
    courseId: string;
    courseKind: "live" | "recorded";
    batchId?: string;
    subjectName?: string;
    grade?: string;
  };
};

type NoteFormState = ResourceScopeValue & ResourceSubjectValue & {
  title: string;
  pdfUrl: string;
  pdfPublicId?: string;
  description?: string;
  isActive?: boolean;
  accessPolicy?: ResourceNoteAccessPolicy;
};

const emptyForm: NoteFormState = {
  ...emptyResourceScope,
  title: "",
  pdfUrl: "",
  pdfPublicId: "",
  description: "",
  isActive: true,
  accessPolicy: "public",
};

export function ResourceNoteModal({
  open,
  onClose,
  onSuccess,
  note,
  role = "admin",
  courseScoped = false,
  lockedCourse,
}: ResourceNoteModalProps) {
  const isEdit = Boolean(note?._id);
  const subjectScoped = role === "admin" && !courseScoped;
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && note) {
      setForm({
        courseKind: note.batchId ? "live" : "recorded",
        chapterId: note.chapterId,
        lessonId: note.lessonId,
        courseId: note.courseId,
        subjectName: note.subject,
        subjectId: note.subjectId,
        subjectCode: note.subjectCode,
        chapterName: note.topic,
        grade: note.grade,
        title: note.title,
        pdfUrl: note.pdfUrl || "",
        pdfPublicId: note.pdfPublicId || "",
        description: note.description || "",
        isActive: note.isActive ?? true,
        accessPolicy: courseScoped ? "batch" : note.accessPolicy ?? "public",
      });
    } else {
      setForm({
        ...emptyForm,
        ...(lockedCourse
          ? {
              courseId: lockedCourse.courseId,
              courseKind: lockedCourse.courseKind,
              batchId: lockedCourse.batchId,
              subjectName: lockedCourse.subjectName,
              grade: lockedCourse.grade,
            }
          : {}),
        accessPolicy: courseScoped ? "batch" : "public",
      });
    }
    setError(null);
  }, [isEdit, note, open, courseScoped, lockedCourse]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.title.trim() || !form.pdfUrl.trim()) {
        setError("Title and PDF are required.");
        setLoading(false);
        return;
      }

      const selectedChapters = Array.from(
        new Set(
          (form.chapterNames?.length
            ? form.chapterNames
            : form.chapterName
              ? [form.chapterName]
              : []
          )
            .map((name) => name.trim())
            .filter(Boolean),
        ),
      );

      if (subjectScoped && (!form.grade || !form.subjectId || selectedChapters.length === 0)) {
        setError(
          !form.grade
            ? "Select class, then subject and chapter."
            : selectedChapters.length === 0 && form.subjectId
            ? "Select at least one chapter."
            : "Select subject and chapter.",
        );
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

      const basePayload = {
        ...(subjectScoped
          ? {
              scopeType: "subject" as const,
              subjectId: form.subjectId,
              subject: form.subjectName,
              subjectCode: form.subjectCode,
              grade: form.grade,
            }
          : scope!),
        title: form.title.trim(),
        pdfUrl: form.pdfUrl.trim(),
        pdfPublicId: form.pdfPublicId,
        description: form.description,
        isActive: form.isActive,
        accessPolicy: courseScoped ? "batch" : form.accessPolicy,
      };

      if (isEdit) {
        const { res, json } = await resourceNotesService.updateNote(note!._id, {
          ...basePayload,
          chapter: selectedChapters[0] || form.chapterName,
        });
        if (!res.ok) {
          setError(json.error || "Failed to save note");
          return;
        }
      } else {
        let saved = 0;
        let lastError = "";
        for (const chapter of subjectScoped ? selectedChapters : [form.chapterName || ""]) {
          const { res, json } = await resourceNotesService.createNote({
            ...basePayload,
            chapter: chapter || form.chapterName,
          });
          if (!res.ok) {
            lastError = json.error || "Failed to save note";
            break;
          }
          saved += 1;
        }
        if (saved === 0) {
          setError(lastError || "Failed to save note");
          return;
        }
        if (lastError) {
          setError(
            `Saved ${saved} of ${selectedChapters.length} notes. ${lastError}`,
          );
          return;
        }
      }

      onSuccess();
    } catch {
      setError("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit resource note" : "Add resource note"}
      onSubmit={handleSubmit}
      loading={loading}
      submitText={
        isEdit
          ? "Save changes"
          : (form.chapterNames?.length || 0) > 1
            ? `Create ${form.chapterNames!.length} notes`
            : "Create note"
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
            key={note?._id || "new-note"}
            value={form}
            onChange={(subject) => setForm((current) => ({ ...current, ...subject }))}
            requireChapter
            enableMultiChapter={subjectScoped && !isEdit}
          />
        ) : (
        <ResourceScopeFields
          value={form}
          onChange={(scope) =>
            setForm((f) => ({
              ...f,
              ...scope,
              ...(lockedCourse
                ? {
                    courseId: lockedCourse.courseId,
                    courseKind: lockedCourse.courseKind,
                  }
                : {}),
            }))
          }
          lockCourse={Boolean(lockedCourse)}
        />
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Title</label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Chapter 1 summary"
            required
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">PDF</p>
          <PDFUpload
            currentPDF={form.pdfUrl || null}
            folder="resources/notes"
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
          <label className="mb-2 block text-sm font-medium">
            Description (optional)
          </label>
          <Input
            value={form.description || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Short note about this PDF"
          />
        </div>

        {!courseScoped ? (
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
                <SelectItem value="public">Public — anyone can download</SelectItem>
                <SelectItem value="batch">
                  Course — enrollment required to download
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Access: course students only (not published to the public Resource Center).
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.checked }))
            }
          />
          Active (visible to enrolled students)
        </label>
      </div>
    </FormModal>
  );
}
