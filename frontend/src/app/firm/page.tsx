"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ShieldIcon, UploadIcon } from "@/components/icons";
import { Card, Kpi, KpiStrip, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, money, monthName } from "@/components/panel/format";
import type { FirmProfile, FirmStats, MarketStats } from "@/components/panel/types";
import { Badge, ErrorNote, Loading } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";

const PACE = {
  fast: { label: "Selling fast", tone: "teal" },
  steady: { label: "Steady", tone: "blue" },
  slow: { label: "No sales this month", tone: "gray" },
} as const;

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">New</span>;
  return (
    <span className={value >= 0 ? "text-[#1a7f37]" : "text-madder"}>
      {value >= 0 ? "+" : ""}
      {value}%
    </span>
  );
}

function Welcome() {
  const params = useSearchParams();
  if (!params.get("welcome")) return null;
  return (
    <p role="status" className="mb-8 rounded-xl border border-ishqor/40 bg-ishqor/5 px-5 py-4 text-[15px]">
      Your seller centre is ready. Add your first product, and we&apos;ll verify the owner details within two working days.
    </p>
  );
}

export default function FirmDashboard() {
  const profile = usePanelData<FirmProfile>("/api/firm/me/");
  const { data, error } = usePanelData<{ own: FirmStats; market: MarketStats }>("/api/firm/stats/");
  const firm = profile.data;

  return (
    <>
      <Suspense>
        <Welcome />
      </Suspense>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <p className="text-sm text-muted">{firm ? `${firm.legal_form_display}, ${firm.city}` : "Seller centre"}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-[40px] leading-tight sm:text-[52px]">
            {firm?.name ?? "Your shop"}
            {firm?.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ishqor/10 px-3 py-1 font-sans text-sm text-ishqor-text">
                <ShieldIcon width={16} height={16} /> Verified seller
              </span>
            )}
          </h1>
          {firm && !firm.is_verified && (
            <p className="mt-2 text-sm text-muted">Owner verification is in progress. You can already list products.</p>
          )}
        </div>
        <Link href="/firm/products/new" className="btn-primary h-12 px-6">
          <UploadIcon width={18} height={18} /> Add a product
        </Link>
      </header>

      <ErrorNote message={error ?? profile.error} />
      {!data ? (
        <Loading label="Gathering your numbers…" />
      ) : (
        <div className="space-y-12">
          {/* Your shop */}
          <section aria-labelledby="own-heading" className="space-y-5">
            <div>
              <h2 id="own-heading" className="font-display text-3xl">
                Your shop
              </h2>
              <p className="mt-1 text-[15px] text-muted">
                The last 30 days compared with the 30 days before.
                {data.own.best_seller && ` Best seller right now: ${data.own.best_seller}.`}
              </p>
            </div>
            <KpiStrip columns={4}>
              <Kpi hero label="Revenue" value={data.own.kpis.revenue.value} format={(n) => money(n)} change={data.own.kpis.revenue.change} comparison="previous 30 days" />
              <Kpi label="Items sold" value={data.own.kpis.units.value} format={count} change={data.own.kpis.units.change} comparison="previous 30 days" />
              <Kpi label="Orders" value={data.own.kpis.orders.value} format={count} change={data.own.kpis.orders.change} comparison="previous 30 days" />
              <Kpi label="Products in the store" value={data.own.kpis.products.value} format={count} />
            </KpiStrip>

            <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
              <StatChart
                id="firm-revenue"
                title="Revenue by month"
                description="Last 12 months. The current month is still in progress."
                data={data.own.revenue_series}
                series={[{ key: "revenue", label: "Revenue" }]}
                format={(n) => money(n, true)}
                labelFormat={(l) => bucketLabel(l, "month", true)}
              />
              <StatChart
                id="firm-weekday"
                title="Busiest days"
                description="Items sold by day of the week, last 90 days"
                data={data.own.weekday}
                series={[{ key: "units", label: "Items sold" }]}
                format={count}
                views={["bar", "line", "numbers"]}
                labelHeader="Day"
              />
            </div>

            <Card title="Your products" description="Which pieces move, and the month each one sold best">
              {data.own.products.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-muted">You haven&apos;t listed anything yet.</p>
                  <Link href="/firm/products/new" className="btn-primary mt-4 h-11 px-6">
                    Add your first product
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-[14px]">
                    <thead className="text-left text-[13px] text-muted">
                      <tr>
                        <th className="pb-2 font-normal">Product</th>
                        <th className="pb-2 text-right font-normal">Price</th>
                        <th className="pb-2 text-right font-normal">Stock</th>
                        <th className="pb-2 text-right font-normal">Sold, 30 days</th>
                        <th className="pb-2 text-right font-normal">Change</th>
                        <th className="pb-2 pl-6 font-normal">Best month</th>
                        <th className="pb-2 font-normal">Pace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data.own.products.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 pr-3">
                            <span className="font-medium">{p.name}</span>
                            {!p.is_active && <span className="ml-2 text-[13px] text-muted">(hidden)</span>}
                          </td>
                          <td className="py-3 text-right tabular-nums">{money(p.price)}</td>
                          <td className={`py-3 text-right tabular-nums ${p.stock === 0 ? "text-madder" : ""}`}>{p.stock}</td>
                          <td className="py-3 text-right tabular-nums">{p.units_30d}</td>
                          <td className="py-3 text-right tabular-nums">
                            <Change value={p.change} />
                          </td>
                          <td className="py-3 pl-6">{monthName(p.peak_month)}</td>
                          <td className="py-3">
                            <Badge tone={PACE[p.pace].tone}>{PACE[p.pace].label}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          {/* The market */}
          <section aria-labelledby="market-heading" className="space-y-5">
            <div>
              <h2 id="market-heading" className="font-display text-3xl">
                The market
              </h2>
              <p className="mt-1 text-[15px] text-muted">What buyers across the whole store are choosing. Your own products are marked.</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card title="Best sellers now" description="Items sold in the last 30 days, across all sellers">
                <ol className="divide-y divide-line">
                  {data.market.top_products.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                      <span className="w-5 shrink-0 text-right text-muted tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="truncate">{p.name}</span>
                          {p.is_yours && <Badge tone="teal">Yours</Badge>}
                        </span>
                        <span className="block text-[13px] text-muted">
                          {p.category}, {p.seller}
                        </span>
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="block font-semibold">{p.units_30d}</span>
                        <span className="block text-[12.5px]">
                          <Change value={p.change} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card title="Cooling off" description="Products selling at least a quarter less than the month before">
                {data.market.declining.length === 0 ? (
                  <p className="text-sm text-muted">Nothing is slowing down sharply right now.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.market.declining.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="truncate">{p.name}</span>
                            {p.is_yours && <Badge tone="teal">Yours</Badge>}
                          </span>
                          <span className="block text-[13px] text-muted">
                            {p.units_prev_30d} sold the month before, {p.units_30d} now
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums">
                          <Change value={p.change} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <StatChart
              id="firm-market-categories"
              title="Demand by craft"
              description="Items sold each month across the store. The current month is still in progress."
              data={data.market.category_trends}
              series={data.market.categories.map((c) => ({ key: c, label: c }))}
              format={count}
              labelFormat={(l) => bucketLabel(l, "month", true)}
              height={280}
            />

            <Card title="Best seller of each month" description="The single most-sold product in each of the last six months">
              <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
                {data.market.monthly_leaders.map((m) => (
                  <li key={m.month} className="bg-surface p-4">
                    <p className="text-[13px] text-muted">{monthName(m.month)}</p>
                    <p className="mt-1 flex items-center gap-2 font-medium">
                      {m.name}
                      {m.is_yours && <Badge tone="teal">Yours</Badge>}
                    </p>
                    <p className="text-[13px] text-muted">
                      {m.units} sold, {m.seller}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
