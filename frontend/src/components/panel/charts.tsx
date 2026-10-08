"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ArrowDownIcon, ArrowUpIcon } from "@/components/icons";

/*
 * Chart palette, validated for colour-vision deficiency on a white surface
 * (dataviz validator: adjacent CVD ΔE ≥ 7.8 with legends + table view, contrast ≥ 3:1).
 * Order is fixed: a series keeps its colour no matter how many others are shown.
 */
export const SERIES = ["#2a5bd7", "#d4762a", "#14998f", "#a83f8f"];
const GRID = "#e6e9ef";
const AXIS = "#d9dee8";
const MUTED = "#586178";

export type View = "line" | "bar" | "numbers";
export type Series = { key: string; label: string; color?: string };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a media query after mount
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Counts from the previous value to the new one, so numbers visibly move when data changes. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no animation: jump straight to the value
      setValue(target);
      from.current = target;
      return;
    }
    const begin = from.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(begin + (target - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return value;
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- KPIs */

export function Delta({ change, goodWhen = "up", comparison }: { change: number | null; goodWhen?: "up" | "down"; comparison: string }) {
  if (change === null || change === undefined) {
    return <p className="mt-2 text-[13px] text-muted">No data for the {comparison} to compare</p>;
  }
  const up = change > 0;
  const flat = change === 0;
  const good = flat ? null : (up && goodWhen === "up") || (!up && goodWhen === "down");
  const tone = good === null ? "text-muted" : good ? "text-[#1a7f37]" : "text-madder";
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px]">
      <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
        {!flat && (up ? <ArrowUpIcon width={14} height={14} /> : <ArrowDownIcon width={14} height={14} />)}
        {Math.abs(change).toFixed(1)}%
      </span>
      <span className="text-muted">vs {comparison}</span>
    </p>
  );
}

export function Kpi({
  label,
  value,
  format,
  change,
  comparison,
  goodWhen,
  hero = false,
  note,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  change?: number | null;
  comparison?: string;
  goodWhen?: "up" | "down";
  hero?: boolean;
  note?: React.ReactNode;
}) {
  const shown = useCountUp(value);
  return (
    <div className="min-w-0 bg-surface px-5 py-5 sm:px-6">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1.5 font-semibold tracking-tight ${hero ? "text-[40px] leading-none sm:text-[44px]" : "text-[28px] leading-tight"}`}>
        {format(hero || Number.isInteger(value) ? Math.round(shown) : shown)}
      </p>
      {change !== undefined && comparison && <Delta change={change} goodWhen={goodWhen} comparison={comparison} />}
      {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
    </div>
  );
}

/** A row of figures inside one panel, separated by hairlines rather than boxed one by one. */
export function KpiStrip({ children, columns = 4 }: { children: React.ReactNode; columns?: number }) {
  const cols =
    { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4", 5: "sm:grid-cols-2 xl:grid-cols-5" }[
      columns
    ] ?? "sm:grid-cols-2";
  // gap-px over a line-coloured background draws hairlines between the cells, in any column count.
  return (
    <div
      className={[
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line",
        cols,
        // Phones: the headline figure gets its own row, the rest pair up.
        "[&>*:first-child]:col-span-2 [&>*:last-child:nth-child(even)]:col-span-2",
        "sm:[&>*:first-child]:col-span-1 sm:[&>*:last-child:nth-child(even)]:col-span-1",
        "sm:[&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- Charts */

const VIEW_LABEL: Record<View, string> = { line: "Line", bar: "Bars", numbers: "Numbers" };

function ViewToggle({ views, value, onChange, label }: { views: View[]; value: View; onChange: (v: View) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={`${label}: chart type`} className="inline-flex rounded-lg bg-porcelain p-0.5">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-7 rounded-md px-2.5 text-[12px] ${value === v ? "bg-surface text-ink shadow-[0_1px_2px_rgba(24,33,58,0.12)]" : "text-muted hover:text-ink"}`}
        >
          {VIEW_LABEL[v]}
        </button>
      ))}
    </div>
  );
}

function useSavedView(id: string, views: View[], fallback: View) {
  const [view, setView] = useState<View>(fallback);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`nafis-chart-view:${id}`) as View | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the reader's saved choice
      if (saved && views.includes(saved)) setView(saved);
    } catch {
      // storage unavailable
    }
  }, [id, views]);
  const choose = (v: View) => {
    setView(v);
    try {
      window.localStorage.setItem(`nafis-chart-view:${id}`, v);
    } catch {
      // storage unavailable
    }
  };
  return [view, choose] as const;
}

type Row = Record<string, string | number>;

function ChartTooltip({
  active,
  payload,
  label,
  series,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string;
  series: Series[];
  format: (n: number) => string;
  labelFormat: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] shadow-[0_8px_24px_rgba(24,33,58,0.12)]">
      <p className="mb-1.5 text-muted">{labelFormat(String(label))}</p>
      {series.map((s, i) => {
        const point = payload.find((p) => p.dataKey === s.key);
        return (
          <p key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: s.color ?? SERIES[i] }} />
            <span className="font-semibold tabular-nums">{format(Number(point?.value ?? 0))}</span>
            {series.length > 1 && <span className="text-muted">{s.label}</span>}
          </p>
        );
      })}
    </div>
  );
}

export function StatChart({
  id,
  title,
  description,
  data,
  series,
  format,
  labelFormat = (l) => l,
  views = ["line", "bar", "numbers"],
  defaultView,
  height = 260,
  dimmed = false,
  labelHeader = "Period",
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  data: Row[];
  series: Series[];
  format: (n: number) => string;
  labelFormat?: (label: string) => string;
  views?: View[];
  defaultView?: View;
  height?: number;
  dimmed?: boolean;
  labelHeader?: string;
}) {
  const [view, setView] = useSavedView(id, views, defaultView ?? views[0]);
  const reduced = usePrefersReducedMotion();
  const color = (i: number) => series[i].color ?? SERIES[i];
  const axisFormat = (n: number) => {
    const text = format(n);
    return text.length > 6 ? format(Math.round(n)) : text;
  };
  const common = {
    data,
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  };
  // Categories (crafts, weekdays) show every label; time axes thin them out.
  const categorical = !views.includes("line") || data.length <= 8;
  const xAxis = (
    <XAxis
      dataKey="label"
      tickFormatter={labelFormat}
      tick={{ fill: MUTED, fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: AXIS }}
      interval={categorical ? 0 : "preserveStartEnd"}
      minTickGap={categorical ? 4 : 18}
    />
  );
  const yAxis = (
    <YAxis
      tickFormatter={axisFormat}
      tick={{ fill: MUTED, fontSize: 12 }}
      tickLine={false}
      axisLine={false}
      width={56}
      allowDecimals={false}
    />
  );
  const tooltip = (
    <Tooltip
      cursor={view === "line" ? { stroke: AXIS, strokeWidth: 1 } : { fill: "rgba(42,91,215,0.06)" }}
      content={<ChartTooltip series={series} format={format} labelFormat={labelFormat} />}
    />
  );

  return (
    <Card
      title={title}
      description={description}
      actions={<ViewToggle views={views} value={view} onChange={setView} label={title} />}
      className={dimmed ? "opacity-60 transition-opacity" : "transition-opacity"}
    >
      {series.length > 1 && view !== "numbers" && (
        <ul className="-mt-2 mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={view === "line" ? "h-0.5 w-3.5 rounded" : "h-2.5 w-2.5 rounded-sm"}
                style={{ background: color(i) }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      {view === "numbers" ? (
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-[14px]">
            <thead className="sticky top-0 bg-surface text-left text-[13px] text-muted">
              <tr>
                <th className="py-2 pr-4 font-normal">{labelHeader}</th>
                {series.map((s) => (
                  <th key={s.key} className="py-2 pl-4 text-right font-normal">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((row) => (
                <tr key={String(row.label)}>
                  <td className="py-2 pr-4">{labelFormat(String(row.label))}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-2 pl-4 text-right tabular-nums">
                      {format(Number(row[s.key] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/20 font-medium">
                <td className="py-2 pr-4">Total</td>
                {series.map((s) => (
                  <td key={s.key} className="py-2 pl-4 text-right tabular-nums">
                    {format(data.reduce((sum, r) => sum + Number(r[s.key] ?? 0), 0))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}, ${VIEW_LABEL[view].toLowerCase()} chart. Switch to Numbers for the values.`}>
          <ResponsiveContainer width="100%" height="100%">
            {view === "line" ? (
              <AreaChart {...common}>
                <CartesianGrid vertical={false} stroke={GRID} />
                {xAxis}
                {yAxis}
                {tooltip}
                {series.map((s, i) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={color(i)}
                    strokeWidth={2}
                    fill={color(i)}
                    fillOpacity={series.length === 1 ? 0.1 : 0}
                    dot={false}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={!reduced}
                    animationDuration={900}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart {...common} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={GRID} />
                {xAxis}
                {yAxis}
                {tooltip}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={color(i)}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                    isAnimationActive={!reduced}
                    animationDuration={800}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Distribution */

export type Segment = { key: string; label: string; count: number; color: string };

/** Part-to-whole as one bar split by thin gaps, with a legend that doubles as a filter. */
export function DistributionBar({
  segments,
  selected,
  onSelect,
}: {
  segments: Segment[];
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;
  const reduced = usePrefersReducedMotion();
  const [grown, setGrown] = useState(reduced);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div>
      <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]" aria-hidden>
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.key}
              className="h-full transition-[flex-grow,opacity] duration-700 ease-out"
              style={{
                flexGrow: grown ? s.count : 0.0001,
                flexBasis: 0,
                background: s.color,
                opacity: selected && selected !== s.key ? 0.25 : 1,
              }}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {segments.map((s) => {
          const active = selected === s.key;
          const content = (
            <>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="font-semibold tabular-nums">{s.count}</span>
              <span className="text-muted tabular-nums">{Math.round((s.count / total) * 100)}%</span>
            </>
          );
          return (
            <li key={s.key}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : s.key)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[14px] ${
                    active ? "bg-tint ring-1 ring-cobalt/40" : "hover:bg-porcelain"
                  }`}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-[14px]">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- Leaderboard */

export function Leaderboard({
  items,
  empty = "No activity in this period yet.",
}: {
  items: { id: number | string; name: string; value: string; detail?: string }[];
  empty?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="space-y-1">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${index === 0 ? "bg-saffron/10" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
              index === 0
                ? "bg-saffron text-ink"
                : index < 3
                  ? "border border-saffron text-ink"
                  : "border border-line text-muted"
            }`}
            aria-label={`Rank ${index + 1}`}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{item.name}</span>
            {item.detail && <span className="block truncate text-[13px] text-muted">{item.detail}</span>}
          </span>
          <span className="shrink-0 text-[15px] font-semibold tabular-nums">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}
