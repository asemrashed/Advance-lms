import type { ResourceTab } from "@/lib/resources/config";

type ResourceEmptyPanelProps = {
  tab: ResourceTab;
  context?: "public" | "student";
};

export function ResourceEmptyPanel({
  tab,
  context = "public",
}: ResourceEmptyPanelProps) {
  const wrapClass =
    context === "student"
      ? ""
      : "mx-auto max-w-screen-2xl px-4 py-8 sm:px-8";

  return (
    <div className={wrapClass}>
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-headline)] text-2xl font-black tracking-tight text-foreground md:text-3xl">
          {tab.label}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tab.description}
        </p>
      </header>

      <div
        className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-foreground">
          Content coming soon
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {context === "student"
            ? `${tab.label} will load here once Phase 18 backend is connected.`
            : `${tab.label} will be available here after the resource APIs are live.`}
        </p>
      </div>
    </div>
  );
}
