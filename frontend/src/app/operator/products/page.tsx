"use client";

import { useState } from "react";

import { money } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import { ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";
import ProductVisual from "@/components/ProductVisual";

type Fact = {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_slug: string;
  seller: string;
  price: string;
  stock: number;
  origin: string;
  materials: string;
  dimensions: string;
  summary: string;
  image: string | null;
  is_active: boolean;
};

const PAGE_SIZE = 12;

export default function OperatorProducts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<number | null>(null);
  const query = useDebounced(search);
  const { data, error, refreshing } = usePanelData<{ count: number; results: Fact[] }>(
    `/api/operator/products/?page=${page}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(query)}`,
  );

  async function copy(p: Fact) {
    const line = `${p.name}: ${money(Number(p.price))}, ${p.stock ? `${p.stock} in stock` : "sold out right now"}. ${p.summary} ${window.location.origin}/products/${p.slug}`;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(p.id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Product facts"
        description="Short facts to pass on to customers: price, stock, size, materials and who sells it."
        actions={
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products"
          />
        }
      />
      <ErrorNote message={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <ul className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${refreshing ? "opacity-60" : ""}`}>
            {data.results.map((p) => (
              <li key={p.id} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
                <ProductVisual name={p.name} slug={p.slug} image={p.image} category={p.category_slug} className="w-24 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-medium">{p.name}</p>
                  <p className="mt-0.5 text-muted">
                    {p.category}, sold by {p.seller}
                  </p>
                  <dl className="mt-2 grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5 text-[13px]">
                    <dt className="text-muted">Price</dt>
                    <dd>{money(Number(p.price))}</dd>
                    <dt className="text-muted">Stock</dt>
                    <dd className={p.stock ? "" : "text-madder"}>{p.stock ? p.stock : "Sold out"}</dd>
                    <dt className="text-muted">Made in</dt>
                    <dd>{p.origin}</dd>
                    {p.materials && (
                      <>
                        <dt className="text-muted">Materials</dt>
                        <dd>{p.materials}</dd>
                      </>
                    )}
                    {p.dimensions && (
                      <>
                        <dt className="text-muted">Size</dt>
                        <dd>{p.dimensions}</dd>
                      </>
                    )}
                  </dl>
                  {!p.is_active && <p className="mt-2 text-[13px] text-madder">Hidden from the store</p>}
                  <button type="button" onClick={() => copy(p)} className="mt-2 text-[13px] text-cobalt underline underline-offset-4">
                    {copied === p.id ? "Copied" : "Copy for a customer"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {data.results.length === 0 && <p className="py-10 text-center text-muted">No products match that search.</p>}
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  );
}
