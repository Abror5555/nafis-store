"use client";

import { useState } from "react";

import { UserPlusIcon } from "@/components/icons";
import { Card, Kpi, KpiStrip, Leaderboard, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, relative } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { RANGE_PHRASE, useRange } from "@/components/panel/RangePicker";
import StaffForm from "@/components/panel/StaffForm";
import type { EditorRow, EditorsSummary, Paged } from "@/components/panel/types";
import { Badge, DataTable, Drawer, ErrorNote, Loading, Pager, SearchBox, useDebounced } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";

type Response = Paged<EditorRow> & { summary: EditorsSummary };

export default function BossEditors() {
  const [range, setRange] = useRange();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const query = useDebounced(search);
  const { data, error, refreshing, reload } = usePanelData<Response>(
    `/api/boss/editors/?range=${range}&page=${page}&search=${encodeURIComponent(query)}`,
  );
  const granularity = range === "12m" ? "month" : "day";

  return (
    <>
      <PageHeader
        title="Content team"
        description="The people who photograph, describe and publish the store's own products."
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <button type="button" onClick={() => setAdding(true)} className="btn-primary h-10 px-5">
              <UserPlusIcon width={18} height={18} /> Add editor
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
          <KpiStrip columns={3}>
            <Kpi hero label="Added today" value={data.summary.today} format={count} />
            <Kpi
              label="Products added"
              value={data.summary.uploads.value}
              format={count}
              change={data.summary.uploads.change}
              comparison={RANGE_PHRASE[range]}
            />
            <Kpi label="Editors" value={data.summary.editors} format={count} />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
            <StatChart
              id="boss-uploads"
              title="Products added"
              data={data.summary.inflow_series}
              series={[{ key: "uploads", label: "Products" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, granularity)}
              defaultView="bar"
              dimmed={refreshing}
            />
            <Card title="Most productive" description="Products added in this period">
              <Leaderboard
                items={data.summary.leaders.map((l) => ({
                  id: l.id,
                  name: l.name,
                  value: `${l.uploads}`,
                  detail: l.today ? `${l.today} added today` : "None today yet",
                }))}
              />
            </Card>
          </div>

          <StatChart
            id="boss-uploads-category"
            title="Added by craft"
            data={data.summary.by_category}
            series={[{ key: "uploads", label: "Products" }]}
            format={count}
            views={["bar", "numbers"]}
            labelHeader="Craft"
            height={200}
            dimmed={refreshing}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">All editors</h2>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, email or phone"
            />
          </div>
          <DataTable<EditorRow>
            dimmed={refreshing}
            rows={data.results}
            empty="No editors yet. Add the first one with the button above."
            columns={[
              {
                key: "name",
                header: "Editor",
                render: (e) => (
                  <span>
                    <span className="flex items-center gap-2 font-medium">
                      {e.name}
                      {e.rank <= 3 && e.uploads_period > 0 && <Badge tone="orange">Top {e.rank}</Badge>}
                      {!e.is_active && <Badge tone="red">Disabled</Badge>}
                    </span>
                    <span className="block text-[13px] text-muted">{e.position || "Content editor"}</span>
                  </span>
                ),
              },
              {
                key: "contact",
                header: "Contact",
                render: (e) => (
                  <span className="text-[13px]">
                    <span className="block">{e.email}</span>
                    <span className="block text-muted">{e.phone}</span>
                  </span>
                ),
              },
              { key: "today", header: "Today", align: "right", render: (e) => e.uploads_today },
              { key: "week", header: "7 days", align: "right", render: (e) => e.uploads_week },
              { key: "period", header: "Period", align: "right", render: (e) => e.uploads_period },
              { key: "total", header: "All time", align: "right", render: (e) => e.uploads_total },
              { key: "last", header: "Last upload", render: (e) => relative(e.last_upload) },
            ]}
          />
          <Pager page={data.page} pageSize={data.page_size} count={data.count} onPage={setPage} />
        </div>
      )}
      <Drawer open={adding} onClose={() => setAdding(false)} title="Add a content editor">
        <StaffForm
          endpoint="/api/boss/editors/"
          kind="content editor"
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
