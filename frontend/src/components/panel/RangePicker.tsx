"use client";

import { useEffect, useState } from "react";

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

export const RANGE_PHRASE: Record<RangeKey, string> = {
  "7d": "previous 7 days",
  "30d": "previous 30 days",
  "90d": "previous 90 days",
  "12m": "previous 12 months",
};

const KEY = "nafis-panel-range";

/** The time range chosen for all statistics on a page; remembered between visits. */
export function useRange(initial: RangeKey = "30d") {
  const [range, setRange] = useState<RangeKey>(initial);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as RangeKey | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved preference after mount
      if (saved && RANGES.some((r) => r.key === saved)) setRange(saved);
    } catch {
      // storage unavailable
    }
  }, []);
  const choose = (next: RangeKey) => {
    setRange(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // storage unavailable
    }
  };
  return [range, choose] as const;
}

export default function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-full border border-line bg-surface p-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          role="radio"
          aria-checked={value === r.key}
          onClick={() => onChange(r.key)}
          className={`h-8 rounded-full px-3.5 text-[13px] transition-colors ${
            value === r.key ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
