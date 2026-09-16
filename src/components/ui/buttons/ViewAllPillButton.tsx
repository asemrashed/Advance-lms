import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { cn } from "@/lib/cn";

type ViewAllPillButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function ViewAllPillButton({
  href,
  children,
  className,
}: ViewAllPillButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-3 rounded-full border-2 border-primary bg-background px-5 py-2 text-sm font-bold text-primary transition-colors duration-300 hover:bg-primary hover:text-on-primary md:text-base",
        className,
      )}
    >
      <span>{children}</span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors duration-300 group-hover:bg-background group-hover:text-primary">
        <LuChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

export default ViewAllPillButton;
