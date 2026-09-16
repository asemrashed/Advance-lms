'use client';

import { LuSearch } from 'react-icons/lu';

export type SidebarItem = {
  id: string;
  label: string;
  count?: number;
};

type SidebarViewMode = 'primary' | 'nested';

interface Props {
  title?: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  items: SidebarItem[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  allLabel?: string;
  emptyMessage?: string;
  nestedTitle?: string;
  nestedItems?: SidebarItem[];
  activeNestedId?: string | null;
  onSelectNested?: (id: string | null) => void;
  allNestedLabel?: string;
  /** Show Subject / Topics toggle instead of stacking topics below subjects. */
  enableViewToggle?: boolean;
  viewMode?: SidebarViewMode;
  onViewModeChange?: (mode: SidebarViewMode) => void;
  primaryToggleLabel?: string;
  nestedToggleLabel?: string;
  nestedEmptyMessage?: string;
  nestedRequiresPrimary?: boolean;
}

export function QuestionBankSubjectSidebar({
  title = 'Subjects',
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  items,
  activeId,
  onSelect,
  allLabel = 'All subjects',
  emptyMessage = 'No items found',
  nestedItems,
  activeNestedId,
  onSelectNested,
  allNestedLabel = 'All topics',
  enableViewToggle = false,
  viewMode = 'primary',
  onViewModeChange,
  primaryToggleLabel = 'Subjects',
  nestedToggleLabel = 'Topics',
  nestedEmptyMessage = 'No topics found',
  nestedRequiresPrimary = true,
}: Props) {
  const query = search.trim().toLowerCase();
  const showingNested = enableViewToggle && viewMode === 'nested';
  const listItems = showingNested ? nestedItems || [] : items;
  const filtered = query
    ? listItems.filter((item) => item.label.toLowerCase().includes(query))
    : listItems;

  const nestedLocked = nestedRequiresPrimary && !activeId;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="shrink-0 border-b border-border px-4 py-3">
        {enableViewToggle ? (
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
            <ToggleButton
              active={viewMode === 'primary'}
              onClick={() => onViewModeChange?.('primary')}
            >
              {primaryToggleLabel}
            </ToggleButton>
            <ToggleButton
              active={viewMode === 'nested'}
              onClick={() => onViewModeChange?.('nested')}
            >
              {nestedToggleLabel}
            </ToggleButton>
          </div>
        ) : (
          <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
        )}
        <div className="relative">
          <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              showingNested ? `Search ${nestedToggleLabel.toLowerCase()}…` : searchPlaceholder
            }
            className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {showingNested && nestedLocked ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Select a subject first to browse topics.
          </p>
        ) : (
          <>
            {showingNested && onSelectNested ? (
              <>
                <SidebarRow
                  active={!activeNestedId}
                  label={allNestedLabel}
                  onClick={() => onSelectNested(null)}
                />
                {filtered.map((item) => (
                  <SidebarRow
                    key={item.id}
                    active={activeNestedId === item.id}
                    label={item.label}
                    count={item.count}
                    onClick={() => onSelectNested(item.id)}
                  />
                ))}
                {!filtered.length ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {nestedEmptyMessage}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <SidebarRow active={!activeId} label={allLabel} onClick={() => onSelect(null)} />
                {filtered.map((item) => (
                  <SidebarRow
                    key={item.id}
                    active={activeId === item.id}
                    label={item.label}
                    count={item.count}
                    onClick={() => onSelect(item.id)}
                  />
                ))}
                {!filtered.length ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </p>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ToggleButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function SidebarRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'border-l-2 border-primary bg-primary/10 font-semibold text-primary'
          : 'text-foreground hover:bg-muted/50'
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {count != null ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
