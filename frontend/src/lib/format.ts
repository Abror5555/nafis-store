export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Nafis";

export function formatPrice(value: string | number): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function pluralize(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Turn a DRF error body into one readable sentence. */
export function errorMessage(body: unknown, fallback = "Something went wrong. Try again."): string {
  if (!body || typeof body !== "object") return fallback;
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(body);
  return parts.length ? parts.join(" ") : fallback;
}
