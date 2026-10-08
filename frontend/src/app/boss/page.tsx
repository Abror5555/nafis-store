"use client";

import Link from "next/link";

import { Card, DistributionBar, Kpi, KpiStrip, Leaderboard, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, duration, money, relative } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { RANGE_PHRASE, useRange } from "@/components/panel/RangePicker";
import { FIRM_SEGMENTS } from "@/components/panel/segments";
import type { Overview } from "@/components/panel/types";
import { Badge, ErrorNote, Loading } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";
import { useAuth } from "@/components/providers/AuthProvider";

const STATUS_TONE = { pending: "orange", paid: "blue", shipped: "teal", delivered: "green", cancelled: "red" } as const;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default function BossOverview() {
  const { user } = useAuth();
  const [range, setRange] = useRange();
  const { data, error, refreshing } = usePanelData<Overview>(`/api/boss/overview/?range=${range}`);
  const comparison = RANGE_PHRASE[range];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.first_name || "there"}`}
        description="Sales first, then partner firms, operators and the content team. Every figure follows the time range you pick."
        actions={<RangePicker value={range} onChange={setRange} />}
      />
      <ErrorNote message={error} />
      {!data ? (
        <Loading />
      ) : (
        <div className={`space-y-10 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
          {/* 1. Sales */}
          <section aria-labelledby="sales-heading" className="space-y-5">
            <h2 id="sales-heading" className="font-display text-2xl">
              Sales
            </h2>
            <KpiStrip columns={5}>
              <Kpi
                hero
                label="Revenue"
                value={data.sales.kpis.revenue.value}
                format={(n) => money(n)}
                change={data.sales.kpis.revenue.change}
                comparison={comparison}
              />
              <Kpi
                label="Orders"
                value={data.sales.kpis.orders.value}
                format={count}
                change={data.sales.kpis.orders.change}
                comparison={comparison}
              />
              <Kpi
                label="Items sold"
                value={data.sales.kpis.units.value}
                format={count}
                change={data.sales.kpis.units.change}
                comparison={comparison}
              />
              <Kpi
                label="Average order"
                value={data.sales.kpis.average_order.value}
                format={(n) => money(n)}
                change={data.sales.kpis.average_order.change}
                comparison={comparison}
              />
              <Kpi
                label="New customers"
                value={data.sales.kpis.new_customers.value}
                format={count}
                change={data.sales.kpis.new_customers.change}
                comparison={comparison}
              />
            </KpiStrip>

            <div className="grid gap-5 xl:grid-cols-2">
              <StatChart
                id="boss-revenue"
                title="Revenue"
                description={`Order totals, ${data.sales.period.label}${range === "12m" ? ". This month is still in progress." : ""}`}
                data={data.sales.revenue_series}
                series={[{ key: "revenue", label: "Revenue" }]}
                format={(n) => money(n, true)}
                labelFormat={(l) => bucketLabel(l, data.sales.period.granularity)}
                dimmed={refreshing}
              />
              <StatChart
                id="boss-orders"
                title="Orders"
                description={`Placed orders, ${data.sales.period.label}`}
                data={data.sales.orders_series}
                series={[{ key: "orders", label: "Orders" }]}
                format={count}
                labelFormat={(l) => bucketLabel(l, data.sales.period.granularity)}
                defaultView="bar"
                dimmed={refreshing}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
              <Card title="Best sellers" description={`By items sold, ${data.sales.period.label}`}>
                {data.sales.top_products.length === 0 ? (
                  <p className="text-sm text-muted">No sales in this period.</p>
                ) : (
                  <table className="w-full text-[14px]">
                    <thead className="text-left text-[13px] text-muted">
                      <tr>
                        <th className="pb-2 font-normal">Product</th>
                        <th className="pb-2 font-normal">Seller</th>
                        <th className="pb-2 text-right font-normal">Sold</th>
                        <th className="pb-2 text-right font-normal">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data.sales.top_products.map((p) => (
                        <tr key={p.name}>
                          <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                          <td className="py-2.5 pr-3 text-muted">{p.seller}</td>
                          <td className="py-2.5 text-right tabular-nums">{p.units}</td>
                          <td className="py-2.5 text-right tabular-nums">{money(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-4 text-[13px] text-muted">
                  Store products earned {money(data.sales.seller_split.store)}, partner firms{" "}
                  {money(data.sales.seller_split.firms)}.
                </p>
              </Card>
              <StatChart
                id="boss-categories"
                title="Revenue by craft"
                description={data.sales.period.label}
                data={data.sales.by_category}
                series={[{ key: "revenue", label: "Revenue" }]}
                format={(n) => money(n, true)}
                views={["bar", "numbers"]}
                labelHeader="Craft"
                dimmed={refreshing}
              />
            </div>
          </section>

          {/* 2. Firms, 3. Operators, 4. Content team */}
          <section aria-labelledby="team-heading" className="space-y-5">
            <h2 id="team-heading" className="font-display text-2xl">
              Partners and team
            </h2>
            <div className="grid gap-5 xl:grid-cols-3">
              <Card
                title="Partner firms"
                description={`${data.firms.total} firms, ${data.firms.verified} verified, ${data.firms.new_this_month} new this month`}
                actions={
                  <Link href="/boss/firms" className="text-sm text-cobalt underline underline-offset-4">
                    All firms
                  </Link>
                }
              >
                <p className="text-[32px] font-semibold leading-none">{money(data.firms.revenue_30d)}</p>
                <p className="mt-1 text-[13px] text-muted">earned by firms in the last 30 days</p>
                <div className="mt-5">
                  <DistributionBar
                    segments={data.firms.segments.map((s) => ({ ...s, color: FIRM_SEGMENTS[s.key].color }))}
                  />
                </div>
              </Card>

              <Card
                title="Operators"
                description={`${data.support.operators} operators, ${data.support.waiting_now} people waiting now`}
                actions={
                  <Link href="/boss/operators" className="text-sm text-cobalt underline underline-offset-4">
                    All operators
                  </Link>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[32px] font-semibold leading-none">{count(data.support.conversations.value)}</p>
                    <p className="mt-1 text-[13px] text-muted">chats, {data.sales.period.label}</p>
                  </div>
                  <div>
                    <p className="text-[32px] font-semibold leading-none">
                      {duration(data.support.avg_response_seconds.value)}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">average first reply</p>
                  </div>
                </div>
                <div className="mt-5">
                  <Leaderboard
                    items={data.support.leaders.slice(0, 3).map((l) => ({
                      id: l.id,
                      name: l.name,
                      value: `${l.conversations} chats`,
                      detail: `${l.customers} customers, replies in ${duration(l.avg_response_seconds)}`,
                    }))}
                  />
                </div>
              </Card>

              <Card
                title="Content team"
                description={`${data.editors.editors} editors, ${data.editors.today} products added today`}
                actions={
                  <Link href="/boss/editors" className="text-sm text-cobalt underline underline-offset-4">
                    Content team
                  </Link>
                }
              >
                <p className="text-[32px] font-semibold leading-none">{count(data.editors.uploads.value)}</p>
                <p className="mt-1 text-[13px] text-muted">products added, {data.sales.period.label}</p>
                <div className="mt-5">
                  <Leaderboard
                    items={data.editors.leaders.slice(0, 3).map((l) => ({
                      id: l.id,
                      name: l.name,
                      value: `${l.uploads}`,
                      detail: l.today ? `${l.today} today` : "None today",
                    }))}
                  />
                </div>
              </Card>
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="space-y-5">
            <div className="flex items-end justify-between">
              <h2 id="recent-heading" className="font-display text-2xl">
                Latest orders
              </h2>
              <Link href="/boss/orders" className="text-sm text-cobalt underline underline-offset-4">
                All orders
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[560px] text-[14px]">
                <tbody className="divide-y divide-line">
                  {data.sales.recent_orders.map((o) => (
                    <tr key={o.number}>
                      <td className="px-4 py-3 font-medium">{o.number}</td>
                      <td className="px-4 py-3">{o.customer}</td>
                      <td className="px-4 py-3 text-muted">{o.city}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[o.status as keyof typeof STATUS_TONE] ?? "gray"}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{relative(o.created_at)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
