"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ResourceWorksheetFileType,
  ResourceWorksheetRow,
} from "@/types/resourceWorksheet";
import { LuBookOpen, LuDownload, LuLock } from "react-icons/lu";

type ResourceWorksheetFileActionsProps = {
  row: ResourceWorksheetRow;
  context: "public" | "student" | "admin";
  canAccess: boolean;
  activeKey: string | null;
  onView: (row: ResourceWorksheetRow, type: ResourceWorksheetFileType) => void;
  onDownload: (row: ResourceWorksheetRow, type: ResourceWorksheetFileType) => void;
  compact?: boolean;
};

function fileAvailable(
  row: ResourceWorksheetRow,
  type: ResourceWorksheetFileType,
): boolean {
  return type === "marks_pdf" ? Boolean(row.hasMarksPdf) : Boolean(row.hasWorksheetPdf);
}

function FileActionRow({
  row,
  type,
  label,
  canAccess,
  context,
  activeKey,
  onView,
  onDownload,
  compact = false,
}: {
  row: ResourceWorksheetRow;
  type: ResourceWorksheetFileType;
  label: string;
  canAccess: boolean;
  context: "public" | "student" | "admin";
  activeKey: string | null;
  onView: (row: ResourceWorksheetRow, type: ResourceWorksheetFileType) => void;
  onDownload: (row: ResourceWorksheetRow, type: ResourceWorksheetFileType) => void;
  compact?: boolean;
}) {
  if (!fileAvailable(row, type)) {
    return (
      <p className="text-xs text-muted-foreground">
        {label} unavailable
      </p>
    );
  }

  if (!canAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button size="sm" variant="outline" disabled className={compact ? "h-8" : undefined}>
                <LuLock className="mr-1 h-4 w-4" />
                {label} locked
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {context === "public" ? (
              <span>
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                and enroll to access.
              </span>
            ) : (
              "Enroll in this course to access."
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const viewKey = `${row._id}-${type}`;
  const downloadKey = `${row._id}-${type}-dl`;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => onView(row, type)}
        disabled={activeKey === viewKey || activeKey === downloadKey}
      >
        <LuBookOpen className="mr-1 h-4 w-4" />
        {activeKey === viewKey ? "Opening..." : compact ? "Read" : `View ${label}`}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={type === "marks_pdf" ? "secondary" : "default"}
        className="shrink-0"
        onClick={() => onDownload(row, type)}
        disabled={activeKey === viewKey || activeKey === downloadKey}
      >
        <LuDownload className="mr-1 h-4 w-4" />
        {activeKey === downloadKey ? "..." : compact ? "Download" : label}
      </Button>
    </div>
  );
}

export function ResourceWorksheetFileActions({
  row,
  context,
  canAccess,
  activeKey,
  onView,
  onDownload,
  compact = false,
}: ResourceWorksheetFileActionsProps) {
  const isUpload = row.sourceType !== "course_qb";

  if (!isUpload) {
    return (
      <FileActionRow
        row={row}
        type="worksheet"
        label="Worksheet"
        canAccess={canAccess}
        context={context}
        activeKey={activeKey}
        onView={onView}
        onDownload={onDownload}
        compact={compact}
      />
    );
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-3 sm:flex-nowrap">
      <FileActionRow
        row={row}
        type="worksheet"
        label="WS"
        canAccess={canAccess}
        context={context}
        activeKey={activeKey}
        onView={onView}
        onDownload={onDownload}
        compact={compact}
      />
      <FileActionRow
        row={row}
        type="marks_pdf"
        label="MS"
        canAccess={canAccess}
        context={context}
        activeKey={activeKey}
        onView={onView}
        onDownload={onDownload}
        compact={compact}
      />
    </div>
  );
}
