import type { Category, Paginated, Product, ProductDetail, StoreConfig } from "./types";

/**
 * Server-side API helpers (used by Server Components).
 * Client Components call the relative `/api/...` path, which Next.js proxies.
 */
const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiUnavailableError extends Error {}

async function get<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiUnavailableError(`Could not reach the API at ${API_URL}`);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API ${path} responded with ${response.status}`);
  return (await response.json()) as T;
}

export async function getCategories(): Promise<Category[]> {
  return (await get<Category[]>("/api/categories/")) ?? [];
}

export async function getProducts(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return (
    (await get<Paginated<Product>>(`/api/products/${qs ? `?${qs}` : ""}`)) ?? {
      count: 0,
      next: null,
      previous: null,
      results: [],
    }
  );
}

export async function getProduct(slug: string) {
  return get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}/`);
}

export const DEFAULT_CONFIG: StoreConfig = {
  store_name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Nafis",
  currency: "usd",
  free_shipping_threshold: 150,
  flat_shipping_rate: 12,
  payment_methods: ["cod"],
  assistant_ai: false,
};

export async function getStoreConfig(): Promise<StoreConfig> {
  try {
    return (await get<StoreConfig>("/api/config/")) ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
