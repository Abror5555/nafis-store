"use client";

import { Card, Kpi, KpiStrip, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, duration, relative, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { useRange } from "@/components/panel/RangePicker";
import type { OperatorRow, SeriesRow } from "@/components/panel/types";
import { ErrorNote, Loading } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";

type Me = {
  profile: { first_name: string; last_name: string; email: string; phone: string; position: string; joined: string };
  stats: { me: OperatorRow | null; team_size: number; inflow_series: SeriesRow[]; team_average_period: number };
  queue: { waiting: number; mine_open: number };
};

export default function OperatorProfile() {
  const [range, setRange] = useRange();
  const { data, error, refreshing } = usePanelData<Me>(`/api/operator/me/?range=${range}`);
  const me = data?.stats.me;

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your details and how your chats are going."
        actions={<RangePicker value={range} onChange={setRange} />}
      />
      <ErrorNote message={error} />
      {!data || !me ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <KpiStrip columns={4}>
            <Kpi hero label="Customers served" value={me.customers_served} format={count} note="All time, counted once per person" />
            <Kpi
              label="Chats this period"
              value={me.conversations_period}
              format={count}
              note={`Team average: ${data.stats.team_average_period}`}
            />
            <Kpi label="Average first reply" value={me.avg_response_seconds ?? 0} format={duration} />
            <Kpi label="Team ranking" value={me.rank} format={(n) => `#${Math.round(n)}`} note={`out of ${data.stats.team_size} operators`} />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
            <StatChart
              id="operator-flow"
              title="Chats you handled"
              data={data.stats.inflow_series}
              series={[{ key: "conversations", label: "Chats" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, range === "12m" ? "month" : "day")}
              dimmed={refreshing}
            />
            <Card title="My details">
              <dl className="divide-y divide-line text-[14px]">
                {[
                  ["Name", `${data.profile.first_name} ${data.profile.last_name}`],
                  ["Role", data.profile.position || "Operator"],
                  ["Email", data.profile.email],
                  ["Phone", data.profile.phone],
                  ["Started", shortDate(data.profile.joined)],
                  ["Messages sent", count(me.messages_total)],
                  ["Chats now open", String(me.open_now)],
                  ["Last reply", relative(me.last_active)],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
