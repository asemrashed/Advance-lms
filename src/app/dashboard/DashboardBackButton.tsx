"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LuArrowLeft } from "react-icons/lu";

/** Constant-position back control for all role dashboard pages. */
export function DashboardBackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 px-2.5 text-sm font-medium"
      onClick={() => router.back()}
      aria-label="Go back"
    >
      <LuArrowLeft className="h-4 w-4" />
      <span>Back</span>
    </Button>
  );
}
