"use client";

import { MinusIcon, PlusIcon } from "./icons";

export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const height = size === "sm" ? "h-9" : "h-12";
  const width = size === "sm" ? "w-9" : "w-11";
  return (
    <div className={`inline-flex items-center rounded-full border border-line bg-surface ${height}`} role="group" aria-label={label}>
      <button
        type="button"
        className={`flex ${height} ${width} items-center justify-center rounded-full disabled:opacity-30`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon width={16} />
      </button>
      <output className="w-6 text-center text-[15px] tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={`flex ${height} ${width} items-center justify-center rounded-full disabled:opacity-30`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon width={16} />
      </button>
    </div>
  );
}
