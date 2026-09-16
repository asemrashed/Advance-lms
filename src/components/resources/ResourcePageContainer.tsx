import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResourcePageContainerProps = {
  children: ReactNode;
  className?: string;
  withPadding?: boolean;
};

export function ResourcePageContainer({
  children,
  className,
  withPadding = true,
}: ResourcePageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl",
        withPadding && "px-4 py-8 sm:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
