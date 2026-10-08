"use client";

import Link from "next/link";
import { useState } from "react";

import ProductVisual from "@/components/ProductVisual";

import { money, shortDate } from "./format";
import ProductForm from "./ProductForm";
import type { ManagedProduct } from "./types";
import { Badge, DataTable, Drawer, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "./ui";
import { usePanelData } from "./usePanelData";

const PAGE_SIZE = 20;

/** A searchable list of the products this editor or firm owns, each editable in a drawer. */
export default function OwnProductsList({ endpoint, extra }: { endpoint: string; extra?: (p: ManagedProduct) => React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ManagedProduct | null>(null);
  const query = useDebounced(search);
  const { data, error, refreshing, reload } = usePanelData<{ count: number; results: ManagedProduct[] }>(
    `${endpoint}?page=${page}&page_size=${PAGE_SIZE}&search=${encodeURIComponent(query)}`,
  );

  return (
    <>
      <ErrorNote message={error} />
      <div className="mb-5 flex justify-end">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search your products"
        />
      </div>
      {!data ? (
        <Loading />
      ) : (
        <>
          <DataTable<ManagedProduct>
            dimmed={refreshing}
            rows={data.results}
            onRowClick={setEditing}
            empty="No products yet."
            columns={[
              {
                key: "name",
                header: "Product",
                render: (p) => (
                  <span className="flex items-center gap-3">
                    <ProductVisual name={p.name} slug={p.slug} image={p.image_url} category={p.category_slug} className="w-11 shrink-0 rounded" />
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="block text-[13px] text-muted">{p.category_name}</span>
                    </span>
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
              ...(extra ? [{ key: "extra", header: "Sales", render: extra }] : []),
              {
                key: "state",
                header: "In store",
                render: (p) => (p.is_active ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>),
              },
              { key: "added", header: "Added", render: (p) => shortDate(p.created_at) },
              {
                key: "view",
                header: "",
                render: (p) =>
                  p.is_active ? (
                    <Link
                      href={`/products/${p.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-cobalt underline underline-offset-4"
                    >
                      View
                    </Link>
                  ) : null,
              },
            ]}
          />
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}
      <Drawer open={!!editing} onClose={() => setEditing(null)} title="Edit product" wide>
        {editing && (
          <ProductForm
            key={editing.id}
            endpoint={`${endpoint}${editing.id}/`}
            initial={editing}
            submitLabel="Save changes"
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Drawer>
    </>
  );
}
