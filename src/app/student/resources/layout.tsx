import type { ReactNode } from "react";
import { ResourceTabBar } from "@/components/resources/ResourceTabBar";

export default function StudentResourcesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
      <header className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 px-6 py-7 text-white shadow-sm sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
          Curated by AdvanceLMS
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          Resources
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50">
          Notes, worksheets, self-tests and past papers, organised by level and
          subject. Public items are open to everyone; enrolled items follow their
          course or batch access rules.
        </p>
      </header>
      <ResourceTabBar />
      <div className="mt-6">{children}</div>
    </div>
  );
}
