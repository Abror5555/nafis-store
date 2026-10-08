"use client";

import { useState } from "react";

import { EyeIcon, ShieldIcon } from "@/components/icons";
import { Card, Delta, DistributionBar, Kpi, KpiStrip, Leaderboard, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, money, monthName, relative, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { useRange } from "@/components/panel/RangePicker";
import { FIRM_SEGMENTS, SEGMENT_NAMES } from "@/components/panel/segments";
import type { FirmProfile, FirmRow, FirmsSummary, FirmStats, Paged } from "@/components/panel/types";
import { Badge, DataTable, Drawer, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";

type FirmsResponse = Paged<FirmRow> & { summary: FirmsSummary };

export default function BossFirms() {
  const [range, setRange] = useRange();
  const [segment, setSegment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-revenue_30d");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const query = useDebounced(search);
  const params = new URLSearchParams({ range, ordering, page: String(page), search: query });
  if (segment) params.set("segment", segment);
  const { data, error, refreshing, reload } = usePanelData<FirmsResponse>(`/api/boss/firms/?${params}`);
  const granularity = range === "12m" ? "month" : "day";

  return (
    <>
      <PageHeader
        title="Partner firms"
        description="Businesses selling through the store: how much they sell, who is thriving and who needs a nudge."
        actions={<RangePicker value={range} onChange={setRange} />}
      />
      <ErrorNote message={error} />
      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <KpiStrip columns={5}>
            <Kpi hero label="Firms" value={data.summary.total} format={count} note={`${data.summary.new_this_month} joined this month`} />
            <Kpi label="Verified" value={data.summary.verified} format={count} note={`${data.summary.total - data.summary.verified} waiting for checks`} />
            <Kpi label="Firm revenue, 30 days" value={data.summary.revenue_30d} format={(n) => money(n)} />
            <Kpi label="Average per selling firm" value={data.summary.average_revenue_30d} format={(n) => money(n)} />
            <Kpi label="Products listed by firms" value={data.summary.products} format={count} />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
            <Card title="How firms are doing" description="Pick a group to filter the list below">
              <DistributionBar
                segments={data.summary.segments.map((s) => ({ ...s, color: FIRM_SEGMENTS[s.key].color }))}
                selected={segment}
                onSelect={(key) => {
                  setSegment(key);
                  setPage(1);
                }}
              />
              <dl className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-line pt-4 text-[13px] sm:grid-cols-2">
                {data.summary.segments.map((s) => (
                  <div key={s.key}>
                    <dt className="inline font-medium">{s.label}: </dt>
                    <dd className="inline text-muted">{FIRM_SEGMENTS[s.key].hint}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Top firms" description="By revenue in the last 30 days">
              <Leaderboard
                items={data.summary.leaders.map((l) => ({
                  id: l.id,
                  name: l.name,
                  value: money(l.revenue_30d),
                  detail: `${l.units_30d} items sold`,
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <StatChart
              id="boss-firm-revenue"
              title="Revenue from firm products"
              data={data.summary.revenue_series}
              series={[{ key: "revenue", label: "Revenue" }]}
              format={(n) => money(n, true)}
              labelFormat={(l) => bucketLabel(l, granularity)}
              dimmed={refreshing}
            />
            <StatChart
              id="boss-firm-signups"
              title="New firms"
              data={data.summary.signups_series}
              series={[{ key: "signups", label: "New firms" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, granularity)}
              defaultView="bar"
              dimmed={refreshing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">
              {segment ? `${SEGMENT_NAMES[segment]} firms` : "All firms"}
              {segment && (
                <button
                  type="button"
                  onClick={() => setSegment(null)}
                  className="ml-3 align-middle text-sm font-normal text-cobalt underline underline-offset-4"
                >
                  Show all
                </button>
              )}
            </h2>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search firm, owner or city"
            />
          </div>
          <DataTable<FirmRow>
            dimmed={refreshing}
            rows={data.results}
            ordering={ordering}
            onOrderingChange={setOrdering}
            onRowClick={(f) => setOpenId(f.id)}
            empty="No firms match these filters."
            columns={[
              {
                key: "name",
                header: "Firm",
                sortKey: "name",
                render: (f) => (
                  <span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {f.name}
                      {f.is_verified && <ShieldIcon width={15} height={15} className="text-ishqor-text" aria-label="Verified" />}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {f.city}, {f.category || "no category"}
                    </span>
                  </span>
                ),
              },
              { key: "owner", header: "Owner", render: (f) => f.owner },
              { key: "products", header: "Products", sortKey: "products", align: "right", render: (f) => f.products },
              {
                key: "rev",
                header: "Revenue, 30 days",
                sortKey: "revenue_30d",
                align: "right",
                render: (f) => (
                  <span>
                    {money(f.revenue_30d)}
                    {f.revenue_change !== null && (
                      <span className={`block text-[12px] ${f.revenue_change >= 0 ? "text-[#1a7f37]" : "text-madder"}`}>
                        {f.revenue_change >= 0 ? "+" : ""}
                        {f.revenue_change}%
                      </span>
                    )}
                  </span>
                ),
              },
              { key: "total", header: "All time", sortKey: "revenue_total", align: "right", render: (f) => money(f.revenue_total) },
              {
                key: "segment",
                header: "Group",
                render: (f) => <Badge tone={FIRM_SEGMENTS[f.segment].tone}>{SEGMENT_NAMES[f.segment]}</Badge>,
              },
              { key: "last", header: "Last sale", render: (f) => relative(f.last_sale) },
              { key: "joined", header: "Joined", sortKey: "joined", render: (f) => shortDate(f.joined) },
            ]}
          />
          <Pager page={data.page} pageSize={data.page_size} count={data.count} onPage={setPage} />
        </div>
      )}
      <FirmDrawer id={openId} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

function FirmDrawer({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const { data, reload } = usePanelData<{ firm: FirmProfile; stats: FirmStats }>(id ? `/api/boss/firms/${id}/` : null);
  const send = useSend();
  const [passport, setPassport] = useState<{ id: number; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const firm = data && data.firm.id === id ? data.firm : null;

  async function act(action: string) {
    if (!firm) return;
    setBusy(true);
    setMessage(null);
    try {
      await send(`/api/boss/firms/${firm.id}/${action}/`, "POST");
      reload();
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (!firm) return;
    try {
      const result = await send<{ passport_number: string }>(`/api/boss/firms/${firm.id}/passport/`, "GET");
      setPassport({ id: firm.id, value: result.passport_number });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't load the passport number.");
    }
  }

  return (
    <Drawer open={id !== null} onClose={onClose} title={firm?.name ?? "Firm"} wide>
      {!firm || !data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {firm.is_verified ? <Badge tone="teal">Verified</Badge> : <Badge tone="orange">Not verified</Badge>}
            {firm.status === "suspended" ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
            <Badge>{firm.legal_form_display}</Badge>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {(["revenue", "units", "orders"] as const).map((k) => (
              <div key={k} className="bg-surface p-4">
                <p className="text-sm text-muted">{{ revenue: "Revenue", units: "Items sold", orders: "Orders" }[k]}, 30 days</p>
                <p className="mt-1 text-2xl font-semibold">
                  {k === "revenue" ? money(data.stats.kpis[k].value) : count(data.stats.kpis[k].value)}
                </p>
                <Delta change={data.stats.kpis[k].change} comparison="previous 30 days" />
              </div>
            ))}
          </div>

          <StatChart
            id="boss-firm-detail"
            title="Monthly revenue"
            data={data.stats.revenue_series}
            series={[{ key: "revenue", label: "Revenue" }]}
            format={(n) => money(n, true)}
            labelFormat={(l) => bucketLabel(l, "month", true)}
            height={200}
          />

          <section className="rounded-xl border border-line bg-surface">
            <h3 className="border-b border-line px-4 py-3 font-medium">Company</h3>
            <dl className="divide-y divide-line text-[14px]">
              {[
                ["Tax ID (STIR)", firm.tax_id],
                ["Main craft", firm.main_category_name || "Not set"],
                ["Address", `${firm.address}, ${firm.city}`],
                ["Phone", firm.phone],
                ["Email", firm.email],
                ["Website", firm.website || "None"],
                ["Joined", shortDate(firm.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-surface">
            <h3 className="border-b border-line px-4 py-3 font-medium">Owner and identity check</h3>
            <dl className="divide-y divide-line text-[14px]">
              {[
                ["Full name", firm.owner_full_name],
                ["Phone", firm.owner_phone],
                ["Sign-in email", firm.owner_email],
                ["Date of birth", shortDate(firm.owner_birth_date)],
                ["Issued by", firm.passport_issued_by],
                ["Issue date", shortDate(firm.passport_issue_date)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4 px-4 py-2.5">
                <dt className="text-muted">Passport</dt>
                <dd className="flex flex-wrap items-center gap-3">
                  <span className="font-mono tracking-wider">
                    {passport?.id === firm.id ? passport.value : firm.passport_masked}
                  </span>
                  {passport?.id !== firm.id && (
                    <button type="button" onClick={reveal} className="inline-flex items-center gap-1 text-sm text-cobalt underline underline-offset-4">
                      <EyeIcon width={15} height={15} /> Show
                    </button>
                  )}
                </dd>
              </div>
            </dl>
            <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
              Passport numbers are stored encrypted. Each time one is shown, it is written to the audit log.
            </p>
          </section>

          {data.stats.products.length > 0 && (
            <section className="rounded-xl border border-line bg-surface">
              <h3 className="border-b border-line px-4 py-3 font-medium">Products</h3>
              <table className="w-full text-[14px]">
                <tbody className="divide-y divide-line">
                  {data.stats.products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5">{p.name}</td>
                      <td className="px-4 py-2.5 text-muted">Best month: {monthName(p.peak_month)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.units_30d} sold</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <button type="button" disabled={busy} onClick={() => act(firm.is_verified ? "unverify" : "verify")} className="btn-primary h-11 px-5">
              {firm.is_verified ? "Remove verification" : "Mark as verified"}
            </button>
            {firm.status === "active" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act("suspend")}
                className="h-11 rounded-full border border-madder px-5 text-[15px] font-medium text-madder hover:bg-madder hover:text-white"
              >
                Suspend firm
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => act("activate")} className="btn-secondary h-11 px-5">
                Reactivate firm
              </button>
            )}
          </div>
          <p className="text-[13px] text-muted">
            Suspending hides all of the firm&apos;s products from the store and blocks its seller centre.
          </p>
          {message && <p role="alert" className="text-sm text-madder">{message}</p>}
        </div>
      )}
    </Drawer>
  );
}
