const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function money(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 10000) {
    return `$${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) || Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}

export function count(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return "No replies yet";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

/** "2026-10-06" -> "Oct 6"; "2026-10-01" with month granularity -> "Oct 2026". */
export function bucketLabel(iso: string, granularity: "day" | "month", short = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (granularity === "month") return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}`;
}

export function monthName(iso: string | null): string {
  if (!iso) return "No sales yet";
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(iso);
}

export function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
