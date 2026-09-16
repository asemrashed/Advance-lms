import Link from "next/link";
import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  children: ReactNode;
  sideTitle: string;
  sideDescription: string;
};

/** Login.html — split editorial panel + form column; full-bleed behind sticky header. */
export function AuthSplitLayout({
  children,
  sideTitle,
  sideDescription,
}: AuthSplitLayoutProps) {
  return (
    <div className="-mt-24 flex min-h-dvh flex-col pt-24 lg:flex-row">
      <section className="relative hidden overflow-hidden lg:flex lg:min-h-[calc(100dvh-6rem)] lg:w-1/2 lg:items-end lg:p-16">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary via-primary/80 to-primary-container" />
        <div className="relative z-10 max-w-xl text-on-primary">
          <Link
            href="/"
            className="mb-8 inline-block cursor-pointer text-sm font-semibold text-on-primary/90 hover:text-on-primary"
          >
            ← AdvanceLMS
          </Link>
          <h2 className="font-[family-name:var(--font-headline)] text-4xl font-black leading-tight">
            {sideTitle}
          </h2>
          <p className="mt-4 text-lg text-on-primary/90">{sideDescription}</p>
        </div>
      </section>
      <section className="flex min-h-[calc(100dvh-6rem)] flex-1 items-center justify-center bg-background px-6 py-12 lg:min-h-[calc(100dvh-6rem)] lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
