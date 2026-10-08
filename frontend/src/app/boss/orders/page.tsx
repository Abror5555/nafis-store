"use client";

import { useState } from "react";

import { money, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import { DataTable, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";

type OrderRow = {
  id: number;
  number: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: string;
  payment_method: "card" | "cod";
  total: string;
  items_count: number;
  created_at: string;
};

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];
const PAGE_SIZE = 20;

export default function BossOrders() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const query = useDebounced(search);
  const send = useSend();
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), search: query });
  if (status) params.set("status", status);
  const { data, error, refreshing, reload } = usePanelData<{ count: number; results: OrderRow[] }>(
    `/api/boss/orders/?${params}`,
  );

  async function changeStatus(order: OrderRow, next: string) {
    setMessage(null);
    try {
      await send(`/api/boss/orders/${order.id}/`, "PATCH", { status: next });
      setMessage(`${order.number} is now ${next}.`);
      reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The status didn't change.");
    }
  }

  return (
    <>
      <PageHeader title="Orders" description="Every order in the store. Change the status as parcels move." />
      <ErrorNote message={error} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Order status" className="flex flex-wrap gap-1.5">
          {["", ...STATUSES].map((s) => (
            <button
              key={s || "all"}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`h-9 rounded-full px-4 text-sm capitalize ${status === s ? "bg-ink text-white" : "border border-line bg-surface hover:border-ink"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search NF-00012, name or city"
        />
      </div>
      {message && (
        <p role="status" className="mb-4 text-sm text-muted">
          {message}
        </p>
      )}
      {!data ? (
        <Loading />
      ) : (
        <>
          <DataTable<OrderRow>
            dimmed={refreshing}
            rows={data.results}
            empty="No orders match."
            columns={[
              { key: "number", header: "Order", render: (o) => <span className="font-medium">{o.number}</span> },
              {
                key: "customer",
                header: "Customer",
                render: (o) => (
                  <span>
                    <span className="block">{o.full_name}</span>
                    <span className="block text-[13px] text-muted">{o.email}</span>
                  </span>
                ),
              },
              { key: "where", header: "Ship to", render: (o) => `${o.city}, ${o.country}` },
              { key: "items", header: "Items", align: "right", render: (o) => o.items_count },
              { key: "total", header: "Total", align: "right", render: (o) => money(Number(o.total)) },
              { key: "pay", header: "Payment", render: (o) => (o.payment_method === "card" ? "Card" : "Cash") },
              {
                key: "status",
                header: "Status",
                render: (o) => (
                  <select
                    aria-label={`Status of ${o.number}`}
                    value={o.status}
                    onChange={(e) => changeStatus(o, e.target.value)}
                    className="h-9 rounded-lg border border-line bg-surface px-2 text-sm capitalize"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ),
              },
              { key: "date", header: "Placed", render: (o) => shortDate(o.created_at) },
            ]}
          />
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}
    </>
  );
}
