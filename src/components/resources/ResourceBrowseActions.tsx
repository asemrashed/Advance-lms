"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LuBookOpen, LuDownload, LuLock } from "react-icons/lu";

type ResourceBrowseActionsProps = {
  context: "public" | "student";
  canAccess: boolean;
  /** Prefer onDownload (view-URL flow) — matches student course details. */
  onDownload?: () => void;
  downloading?: boolean;
  /** Fallback direct href when onDownload is not provided. */
  downloadHref?: string;
  lockedMessage?: string;
  onRead: () => void;
  reading?: boolean;
  /** Stretch action buttons across the card on small screens. */
  stacked?: boolean;
};

export function ResourceBrowseActions({
  context,
  canAccess,
  onDownload,
  downloading = false,
  downloadHref,
  lockedMessage = "Enroll in this course to access.",
  onRead,
  reading = false,
  stacked = false,
}: ResourceBrowseActionsProps) {
  if (!canAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button size="sm" variant="outline" disabled>
                <LuLock className="mr-1 h-4 w-4" />
                Locked
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {context === "public" ? (
              <span>
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                and enroll in a matching batch to access.
              </span>
            ) : (
              lockedMessage
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        stacked ? "w-full sm:w-auto sm:justify-end" : "flex-wrap justify-end",
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={stacked ? "h-9 flex-1 sm:flex-none" : undefined}
        onClick={onRead}
        disabled={reading || downloading}
      >
        <LuBookOpen className="mr-1 h-4 w-4" />
        {reading ? "Opening..." : "Read"}
      </Button>
      {onDownload ? (
        <Button
          type="button"
          size="sm"
          className={stacked ? "h-9 flex-1 sm:flex-none" : undefined}
          onClick={onDownload}
          disabled={reading || downloading}
        >
          <LuDownload className="mr-1 h-4 w-4" />
          {downloading ? "Downloading..." : "Download"}
        </Button>
      ) : downloadHref ? (
        <Button asChild size="sm">
          <a href={downloadHref} target="_blank" rel="noopener noreferrer">
            <LuDownload className="mr-1 h-4 w-4" />
            Download
          </a>
        </Button>
      ) : null}
    </div>
  );
}
