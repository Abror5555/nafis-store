"use client";

import { useState } from "react";

import { Card, DistributionBar, Kpi, KpiStrip, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, money, relative, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { useRange } from "@/components/panel/RangePicker";
import { CUSTOMER_SEGMENTS, ROLE_NAMES, SEGMENT_NAMES } from "@/components/panel/segments";
import type { Paged, SegmentCount, SeriesRow, UserRow } from "@/components/panel/types";
import { Badge, DataTable, Drawer, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";

type UsersResponse = Paged<UserRow> & {
  summary: {
    roles: Record<string, number>;
    segments: SegmentCount[];
    signups_series: SeriesRow[];
    total: number;
  };
};

const ROLE_TABS = [
  { key: "all", label: "Everyone" },
  { key: "customer", label: "Customers" },
  { key: "firm", label: "Firms" },
  { key: "operator", label: "Operators" },
  { key: "editor", label: "Content editors" },
  { key: "boss", label: "Owners" },
];

export default function BossUsers() {
  const [range, setRange] = useRange();
  const [role, setRole] = useState("all");
  const [segment, setSegment] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-joined");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useDebounced(search);
  const send = useSend();

  const params = new URLSearchParams({ range, role, ordering, page: String(page), search: query });
  if (segment) params.set("segment", segment);
  const { data, error, refreshing, reload } = usePanelData<UsersResponse>(`/api/boss/users/?${params}`);

  const granularity = range === "12m" ? "month" : "day";
  const pick = (fn: () => void) => {
    fn();
    setPage(1);
  };

  async function toggleActive(user: UserRow) {
    setBusy(true);
    setActionError(null);
    try {
      const result = await send<{ is_active: boolean }>(`/api/boss/users/${user.id}/`, "PATCH", { is_active: !user.is_active });
      setSelected({ ...user, is_active: result.is_active });
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on the platform. Customer health groups update daily from orders and sign-ins."
        actions={<RangePicker value={range} onChange={setRange} />}
      />
      <ErrorNote message={error} />
      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <KpiStrip columns={5}>
            <Kpi hero label="All accounts" value={data.summary.total} format={count} />
            <Kpi label="Customers" value={data.summary.roles.customer ?? 0} format={count} />
            <Kpi label="Partner firms" value={data.summary.roles.firm ?? 0} format={count} />
            <Kpi label="Operators" value={data.summary.roles.operator ?? 0} format={count} />
            <Kpi label="Content editors" value={data.summary.roles.editor ?? 0} format={count} />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
            <Card title="Customer health" description="Pick a group to filter the list below">
              <DistributionBar
                segments={data.summary.segments.map((s) => ({ ...s, color: CUSTOMER_SEGMENTS[s.key].color }))}
                selected={segment}
                onSelect={(key) =>
                  pick(() => {
                    setSegment(key);
                    if (key) setRole("customer");
                  })
                }
              />
              <dl className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-line pt-4 text-[13px] sm:grid-cols-2">
                {data.summary.segments.map((s) => (
                  <div key={s.key}>
                    <dt className="inline font-medium">{s.label}: </dt>
                    <dd className="inline text-muted">{CUSTOMER_SEGMENTS[s.key].hint}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <StatChart
              id="boss-signups"
              title="New customer sign-ups"
              data={data.summary.signups_series}
              series={[{ key: "signups", label: "Sign-ups" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, granularity)}
              defaultView="bar"
              dimmed={refreshing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Account type" className="flex flex-wrap gap-1.5">
              {ROLE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={role === t.key}
                  onClick={() =>
                    pick(() => {
                      setRole(t.key);
                      if (t.key !== "customer") setSegment(null);
                    })
                  }
                  className={`h-9 rounded-full px-4 text-sm ${role === t.key ? "bg-ink text-white" : "border border-line bg-surface hover:border-ink"}`}
                >
                  {t.label}
                  {t.key !== "all" && <span className="ml-1.5 opacity-70">{data.summary.roles[t.key] ?? 0}</span>}
                </button>
              ))}
            </div>
            <SearchBox value={search} onChange={(v) => pick(() => setSearch(v))} placeholder="Search name or email" />
          </div>
          {segment && (
            <p className="text-sm">
              Showing <strong>{SEGMENT_NAMES[segment]}</strong> customers.{" "}
              <button type="button" onClick={() => pick(() => setSegment(null))} className="text-cobalt underline underline-offset-4">
                Show all
              </button>
            </p>
          )}

          <DataTable<UserRow>
            dimmed={refreshing}
            rows={data.results}
            ordering={ordering}
            onOrderingChange={(o) => pick(() => setOrdering(o))}
            onRowClick={setSelected}
            empty="No accounts match these filters."
            columns={[
              {
                key: "name",
                header: "Name",
                sortKey: "name",
                render: (u) => (
                  <span>
                    <span className="block font-medium">{u.name}</span>
                    <span className="block text-[13px] text-muted">{u.detail || u.email}</span>
                  </span>
                ),
              },
              { key: "role", header: "Type", render: (u) => ROLE_NAMES[u.role] ?? u.role },
              {
                key: "segment",
                header: "Group",
                render: (u) =>
                  u.segment ? (
                    <Badge tone={CUSTOMER_SEGMENTS[u.segment].tone}>{SEGMENT_NAMES[u.segment]}</Badge>
                  ) : (
                    <span className="text-muted">Staff or partner</span>
                  ),
              },
              { key: "orders", header: "Orders", sortKey: "orders", align: "right", render: (u) => u.orders ?? "" },
              { key: "spend", header: "Spent", sortKey: "spend", align: "right", render: (u) => (u.spend == null ? "" : money(u.spend)) },
              { key: "joined", header: "Joined", sortKey: "joined", render: (u) => shortDate(u.joined) },
              { key: "seen", header: "Last seen", sortKey: "last_seen", render: (u) => relative(u.last_seen) },
              {
                key: "status",
                header: "Status",
                render: (u) => (u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>),
              },
            ]}
          />
          <Pager page={data.page} pageSize={data.page_size} count={data.count} onPage={setPage} />
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setActionError(null);
        }} title={selected?.name ?? ""}>
        {selected && (
          <div className="space-y-6">
            <dl className="divide-y divide-line rounded-xl border border-line bg-surface text-[14px]">
              {[
                ["Email", selected.email],
                ["Type", ROLE_NAMES[selected.role]],
                ["Group", selected.segment ? SEGMENT_NAMES[selected.segment] : "Staff or partner"],
                ["Orders", selected.orders ?? "None"],
                ["Spent", selected.spend == null ? "None" : money(selected.spend)],
                ["Joined", shortDate(selected.joined)],
                ["Last seen", relative(selected.last_seen)],
              ].map(([k, v]) => (
                <div key={String(k)} className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {selected.role !== "boss" && (
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="font-medium">{selected.is_active ? "Disable this account" : "Enable this account"}</p>
                <p className="mt-1 text-sm text-muted">
                  {selected.is_active
                    ? "They won't be able to sign in. Their orders and history stay."
                    : "They will be able to sign in again."}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleActive(selected)}
                  className={`mt-4 h-10 rounded-full px-5 text-sm font-medium ${
                    selected.is_active ? "bg-madder text-white hover:bg-madder/90" : "btn-primary"
                  }`}
                >
                  {selected.is_active ? "Disable account" : "Enable account"}
                </button>
                {actionError && <p role="alert" className="mt-3 text-sm text-madder">{actionError}</p>}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
