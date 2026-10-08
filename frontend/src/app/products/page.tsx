import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ApiDown from "@/components/ApiDown";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import { ApiUnavailableError, getCategories, getProducts } from "@/lib/api";
import { pluralize } from "@/lib/format";

type Search = Record<string, string | undefined>;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PAGE_SIZE = 12;
const PRICE_CAPS = [
  { value: "25", label: "Under $25" },
  { value: "50", label: "Under $50" },
  { value: "100", label: "Under $100" },
];

function normalize(raw: Record<string, string | string[] | undefined>): Search {
  const out: Search = {};
  for (const key of ["category", "search", "ordering", "page", "max_price", "in_stock"]) {
    const value = raw[key];
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

function href(current: Search, changes: Search) {
  const next = new URLSearchParams();
  const merged = { ...current, page: undefined, ...changes };
  for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
  const qs = next.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category, search } = normalize(await searchParams);
  if (search) return { title: `Search: ${search}` };
  if (category) return { title: category.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) };
  return { title: "All products" };
}

function FilterLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={active ? "font-medium text-cobalt" : "text-ink hover:text-cobalt"}
    >
      {children}
    </Link>
  );
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = normalize(await searchParams);
  let data;
  try {
    data = await Promise.all([getCategories(), getProducts(params)]);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return <ApiDown />;
    throw error;
  }
  const [categories, products] = data;
  const category = categories.find((c) => c.slug === params.category);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pages = Math.max(1, Math.ceil(products.count / PAGE_SIZE));
  const total = categories.reduce((sum, c) => sum + c.product_count, 0);
  const filtered = Boolean(params.max_price || params.in_stock || params.search);

  const title = params.search ? `Results for “${params.search}”` : (category?.name ?? "All products");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      {category && !params.search && (
        <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted">{category.description}</p>
      )}

      {/* Category chips on small screens */}
      <nav aria-label="Crafts" className="-mx-4 mt-6 overflow-x-auto px-4 lg:hidden">
        <ul className="flex gap-2 whitespace-nowrap">
          {[{ slug: undefined, name: "All" }, ...categories].map((c) => {
            const active = params.category === c.slug;
            return (
              <li key={c.slug ?? "all"}>
                <Link
                  href={href(params, { category: c.slug })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-9 items-center rounded-full border px-4 text-sm ${
                    active ? "border-ink bg-ink text-porcelain" : "border-line bg-surface"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[200px_1fr]">
        <aside className="hidden space-y-8 text-[15px] lg:block">
          <nav aria-label="Crafts">
            <h2 className="text-sm text-muted">Craft</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <FilterLink to={href(params, { category: undefined })} active={!params.category}>
                  All products <span className="text-muted">({total})</span>
                </FilterLink>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <FilterLink to={href(params, { category: c.slug })} active={params.category === c.slug}>
                    {c.name} <span className="text-muted">({c.product_count})</span>
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-sm text-muted">Price</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <FilterLink to={href(params, { max_price: undefined })} active={!params.max_price}>
                  Any price
                </FilterLink>
              </li>
              {PRICE_CAPS.map((p) => (
                <li key={p.value}>
                  <FilterLink to={href(params, { max_price: p.value })} active={params.max_price === p.value}>
                    {p.label}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm text-muted">Availability</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <FilterLink to={href(params, { in_stock: undefined })} active={!params.in_stock}>
                  Everything
                </FilterLink>
              </li>
              <li>
                <FilterLink to={href(params, { in_stock: "true" })} active={params.in_stock === "true"}>
                  In stock only
                </FilterLink>
              </li>
            </ul>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p className="text-sm text-muted" aria-live="polite">
              {pluralize(products.count, "product", "products")}
              {filtered && (
                <>
                  {" "}
                  <Link href={href({ category: params.category }, {})} className="ml-2 text-cobalt underline underline-offset-4">
                    Clear filters
                  </Link>
                </>
              )}
            </p>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>

          {products.results.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-2xl">No products match these filters</p>
              <p className="mt-2 text-muted">Try another craft or a higher price limit.</p>
              <Link href="/products" className="btn-secondary mt-6 h-11 px-6">
                Show all products
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
              {products.results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={href(params, { page: n === 1 ? undefined : String(n) })}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${
                    n === page ? "bg-ink text-porcelain" : "hover:bg-tint"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
