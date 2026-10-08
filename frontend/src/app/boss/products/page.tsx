"use client";

import Link from "next/link";
import { useState } from "react";

import { money, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import { DataTable, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";
import ProductVisual from "@/components/ProductVisual";

type Row = {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_slug: string;
  seller: string;
  uploaded_by: string;
  price: string;
  stock: number;
  image: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
};

const PAGE_SIZE = 20;
const SELLERS = [
  { key: "", label: "All sellers" },
  { key: "store", label: "Store's own" },
  { key: "firms", label: "Partner firms" },
];

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-ishqor" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function BossProducts() {
  const [seller, setSeller] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(search);
  const send = useSend();
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), search: query, seller });
  const { data, error, refreshing, reload } = usePanelData<{ count: number; results: Row[] }>(
    `/api/boss/products/?${params}`,
  );

  async function update(row: Row, change: Partial<Pick<Row, "is_active" | "is_featured">>) {
    await send(`/api/boss/products/${row.id}/`, "PATCH", change);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalog, from the store and from partner firms. Hide a product or feature it on the home page."
      />
      <ErrorNote message={error} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Seller" className="flex flex-wrap gap-1.5">
          {SELLERS.map((s) => (
            <button
              key={s.key || "all"}
              type="button"
              role="tab"
              aria-selected={seller === s.key}
              onClick={() => {
                setSeller(s.key);
                setPage(1);
              }}
              className={`h-9 rounded-full px-4 text-sm ${seller === s.key ? "bg-ink text-white" : "border border-line bg-surface hover:border-ink"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search product, firm or editor"
        />
      </div>
      {!data ? (
        <Loading />
      ) : (
        <>
          <DataTable<Row>
            dimmed={refreshing}
            rows={data.results}
            empty="No products match."
            columns={[
              {
                key: "name",
                header: "Product",
                render: (p) => (
                  <span className="flex items-center gap-3">
                    <ProductVisual
                      name={p.name}
                      slug={p.slug}
                      image={p.image}
                      category={p.category_slug}
                      className="w-11 shrink-0 rounded"
                    />
                    <span>
                      <Link href={`/products/${p.slug}`} className="block font-medium hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-[13px] text-muted">{p.category}</span>
                    </span>
                  </span>
                ),
              },
              {
                key: "seller",
                header: "Seller",
                render: (p) => (
                  <span>
                    <span className="block">{p.seller}</span>
                    {p.uploaded_by && <span className="block text-[13px] text-muted">Added by {p.uploaded_by}</span>}
                  </span>
                ),
              },
              { key: "price", header: "Price", align: "right", render: (p) => money(Number(p.price)) },
              {
                key: "stock",
                header: "Stock",
                align: "right",
                render: (p) => (p.stock === 0 ? <span className="text-madder">Sold out</span> : p.stock),
              },
              { key: "added", header: "Added", render: (p) => shortDate(p.created_at) },
              {
                key: "active",
                header: "Visible",
                render: (p) => (
                  <Toggle checked={p.is_active} label={`Show ${p.name} in the store`} onChange={() => update(p, { is_active: !p.is_active })} />
                ),
              },
              {
                key: "featured",
                header: "Featured",
                render: (p) => (
                  <Toggle
                    checked={p.is_featured}
                    label={`Feature ${p.name} on the home page`}
                    onChange={() => update(p, { is_featured: !p.is_featured })}
                  />
                ),
              },
            ]}
          />
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  );
}
