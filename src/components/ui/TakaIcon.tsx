import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type TakaIconProps = {
  className?: string;
  style?: CSSProperties;
};

/** Bangladeshi Taka (৳) glyph for price fields and stats. */
export function TakaIcon({ className, style }: TakaIconProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold leading-none",
        className,
      )}
      style={style}
      aria-hidden
    >
      ৳
    </span>
  );
}
