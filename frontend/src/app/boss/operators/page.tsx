"use client";

import { useState } from "react";

import { UserPlusIcon } from "@/components/icons";
import { Card, Kpi, KpiStrip, Leaderboard, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, duration, relative } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { RANGE_PHRASE, useRange } from "@/components/panel/RangePicker";
import StaffForm from "@/components/panel/StaffForm";
import type { OperatorRow, Paged, SupportSummary } from "@/components/panel/types";
import { Badge, DataTable, Drawer, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";

type Response = Paged<OperatorRow> & { summary: SupportSummary };

export default function BossOperators() {
  const [range, setRange] = useRange();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const query = useDebounced(search);
  const { data, error, refreshing, reload } = usePanelData<Response>(
    `/api/boss/operators/?range=${range}&page=${page}&search=${encodeURIComponent(query)}`,
  );
  const granularity = range === "12m" ? "month" : "day";
  const comparison = RANGE_PHRASE[range];

  return (
    <>
      <PageHeader
        title="Operators"
        description="The people answering customers in the shop chat: how many they help, how fast they reply and when customers write."
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <button type="button" onClick={() => setAdding(true)} className="btn-primary h-10 px-5">
              <UserPlusIcon width={18} height={18} /> Add operator
            </button>
          </>
        }
      />
      <ErrorNote message={error} />
      {created && (
        <p role="status" className="mb-6 rounded-lg border border-ishqor/40 bg-ishqor/5 px-4 py-3 text-[15px]">
          Account created for {created}. They can sign in now.
        </p>
      )}
      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <KpiStrip columns={5}>
            <Kpi
              hero
              label="Waiting right now"
              value={data.summary.waiting_now}
              format={count}
              note={`${data.summary.open_now} chats in progress`}
            />
            <Kpi
              label="Chats"
              value={data.summary.conversations.value}
              format={count}
              change={data.summary.conversations.change}
              comparison={comparison}
            />
            <Kpi
              label="Customers helped"
              value={data.summary.customers.value}
              format={count}
              change={data.summary.customers.change}
              comparison={comparison}
            />
            <Kpi
              label="Average first reply"
              value={data.summary.avg_response_seconds.value}
              format={duration}
              change={data.summary.avg_response_seconds.change}
              comparison={comparison}
              goodWhen="down"
            />
            <Kpi label="Chats resolved" value={data.summary.resolution_rate} format={(n) => `${n.toFixed(1)}%`} />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
            <StatChart
              id="boss-chat-flow"
              title="Customer flow"
              description="New chats started by customers"
              data={data.summary.inflow_series}
              series={[{ key: "conversations", label: "Chats" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, granularity)}
              dimmed={refreshing}
            />
            <Card title="Best operators" description="Most chats handled in this period">
              <Leaderboard
                items={data.summary.leaders.map((l) => ({
                  id: l.id,
                  name: l.name,
                  value: `${l.conversations}`,
                  detail: `${l.customers} customers, first reply in ${duration(l.avg_response_seconds)}`,
                }))}
              />
            </Card>
          </div>

          <StatChart
            id="boss-chat-hours"
            title="When customers write"
            description="Chats started by hour of the day, Tashkent time"
            data={data.summary.by_hour}
            series={[{ key: "conversations", label: "Chats" }]}
            format={count}
            defaultView="bar"
            labelHeader="Hour"
            height={220}
            dimmed={refreshing}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">All operators</h2>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, email or phone"
            />
          </div>
          <DataTable<OperatorRow>
            dimmed={refreshing}
            rows={data.results}
            empty="No operators yet. Add the first one with the button above."
            columns={[
              {
                key: "name",
                header: "Operator",
                render: (o) => (
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      {o.name}
                      {o.rank <= 3 && o.conversations_period > 0 && <Badge tone="orange">Top {o.rank}</Badge>}
                      {!o.is_active && <Badge tone="red">Disabled</Badge>}
                    </span>
                    <span className="block text-[13px] text-muted">{o.position || "Operator"}</span>
                  </span>
                ),
              },
              {
                key: "contact",
                header: "Contact",
                render: (o) => (
                  <span className="text-[13px]">
                    <span className="block">{o.email}</span>
                    <span className="block text-muted">{o.phone}</span>
                  </span>
                ),
              },
              { key: "chats", header: "Chats, period", align: "right", render: (o) => o.conversations_period },
              { key: "served", header: "Customers served", align: "right", render: (o) => o.customers_served },
              { key: "messages", header: "Messages sent", align: "right", render: (o) => o.messages_total },
              { key: "reply", header: "First reply", align: "right", render: (o) => duration(o.avg_response_seconds) },
              { key: "open", header: "Open now", align: "right", render: (o) => o.open_now },
              { key: "active", header: "Last active", render: (o) => relative(o.last_active) },
            ]}
          />
          <Pager page={data.page} pageSize={data.page_size} count={data.count} onPage={setPage} />
        </div>
      )}
      <Drawer open={adding} onClose={() => setAdding(false)} title="Add an operator">
        <StaffForm
          endpoint="/api/boss/operators/"
          kind="operator"
          onCreated={(email) => {
            setAdding(false);
            setCreated(email);
            reload();
          }}
        />
      </Drawer>
    </>
  );
}
