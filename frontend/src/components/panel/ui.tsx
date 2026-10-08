"use client";

import { useEffect, useState } from "react";

import { CloseIcon } from "@/components/icons";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
  sortKey?: string;
  className?: string;
};

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  ordering,
  onOrderingChange,
  empty = "Nothing here yet.",
  dimmed = false,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  ordering?: string;
  onOrderingChange?: (ordering: string) => void;
  empty?: string;
  dimmed?: boolean;
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-line bg-surface transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      <table className="w-full min-w-[720px] text-[14px]">
        <thead>
          <tr className="border-b border-line text-left text-[13px] text-muted">
            {columns.map((c) => {
              const active = ordering?.replace("-", "") === c.sortKey;
              const desc = ordering?.startsWith("-");
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (desc ? "descending" : "ascending") : undefined}
                  className={`px-4 py-3 font-normal ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.sortKey && onOrderingChange ? (
                    <button
                      type="button"
                      onClick={() => onOrderingChange(active && desc ? c.sortKey! : `-${c.sortKey}`)}
                      className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
                    >
                      {c.header}
                      <span aria-hidden className="text-[10px]">{active ? (desc ? "▼" : "▲") : ""}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer hover:bg-porcelain" : undefined}
            >
              {columns.map((c, i) => (
                <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>
                  {i === 0 && onRowClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                      className="text-left hover:underline hover:underline-offset-4"
                    >
                      {c.render(row)}
                    </button>
                  ) : (
                    c.render(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} of {count}
      </span>
      <span className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary h-9 px-4 disabled:opacity-40">
          Previous
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary h-9 px-4 disabled:opacity-40">
          Next
        </button>
      </span>
    </nav>
  );
}

const TONES = {
  blue: "bg-[#2a5bd7]/10 text-[#1f46a8]",
  teal: "bg-ishqor/12 text-ishqor-text",
  orange: "bg-[#d4762a]/12 text-[#8a4512]",
  plum: "bg-[#a83f8f]/10 text-[#7d2c6a]",
  gray: "bg-ink/6 text-muted",
  red: "bg-madder/10 text-madder",
  green: "bg-[#1a7f37]/10 text-[#1a7f37]",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] ${TONES[tone]}`}>{children}</span>;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`panel-slide-right absolute inset-y-0 right-0 flex w-full flex-col bg-porcelain ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-tint" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm sm:w-72"
    />
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-6 rounded-lg border border-madder/40 bg-madder/5 px-4 py-3 text-[15px] text-madder">
      {message}
    </p>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-16 text-center text-muted">{label}</p>;
}

/** Small helper so a debounced search box doesn't refetch on every keystroke. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
