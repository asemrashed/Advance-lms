"use client";

import { useMemo, useState } from "react";
import { LuCheck, LuChevronsUpDown, LuSearch } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableFilterOption = {
  value: string;
  label: string;
};

type SearchableFilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableFilterOption[];
  allLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
};

export function SearchableFilterSelect({
  value,
  onChange,
  options,
  allLabel,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  className,
  disabled = false,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel =
    value === "all"
      ? allLabel
      : options.find((opt) => opt.value === value)?.label ?? placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between font-normal",
            value === "all" && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <div className="relative mb-2">
          <LuSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => pick("all")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              value === "all" && "bg-accent",
            )}
          >
            <LuCheck
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                value === "all" ? "opacity-100" : "opacity-0",
              )}
            />
            {allLabel}
          </button>
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No matches
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value === opt.value && "bg-accent",
                )}
              >
                <LuCheck
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === opt.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
