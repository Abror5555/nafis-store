"use client";

import Link from "next/link";

import { UploadIcon } from "@/components/icons";
import { Card, Kpi, KpiStrip, StatChart } from "@/components/panel/charts";
import { bucketLabel, count, relative, shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import RangePicker, { useRange } from "@/components/panel/RangePicker";
import type { EditorRow, ManagedProduct, SeriesRow } from "@/components/panel/types";
import { ErrorNote, Loading } from "@/components/panel/ui";
import { usePanelData } from "@/components/panel/usePanelData";
import ProductVisual from "@/components/ProductVisual";

type Me = {
  profile: { first_name: string; last_name: string; email: string; phone: string; position: string; joined: string };
  stats: { me: EditorRow | null; team_size: number; inflow_series: SeriesRow[]; by_category: SeriesRow[] };
};

export default function EditorHome() {
  const [range, setRange] = useRange();
  const { data, error, refreshing } = usePanelData<Me>(`/api/editor/me/?range=${range}`);
  const recent = usePanelData<{ results: ManagedProduct[] }>("/api/editor/products/?page_size=6");
  const me = data?.stats.me;

  return (
    <>
      <PageHeader
        title={data ? `Hello, ${data.profile.first_name}` : "My work"}
        description="Your uploads at a glance. Add products from the button on the right."
        actions={
          <>
            <RangePicker value={range} onChange={setRange} />
            <Link href="/editor/new" className="btn-primary h-10 px-5">
              <UploadIcon width={18} height={18} /> Add a product
            </Link>
          </>
        }
      />
      <ErrorNote message={error} />
      {!data || !me ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <KpiStrip columns={4}>
            <Kpi hero label="Added today" value={me.uploads_today} format={count} />
            <Kpi label="Last 7 days" value={me.uploads_week} format={count} />
            <Kpi label="This period" value={me.uploads_period} format={count} />
            <Kpi
              label="Team ranking"
              value={me.rank}
              format={(n) => `#${Math.round(n)}`}
              note={`out of ${data.stats.team_size} editors, ${me.uploads_total} products in total`}
            />
          </KpiStrip>

          <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
            <StatChart
              id="editor-uploads"
              title="Products you added"
              data={data.stats.inflow_series}
              series={[{ key: "uploads", label: "Products" }]}
              format={count}
              labelFormat={(l) => bucketLabel(l, range === "12m" ? "month" : "day")}
              defaultView="bar"
              dimmed={refreshing}
            />
            <StatChart
              id="editor-categories"
              title="By craft, all time"
              data={data.stats.by_category}
              series={[{ key: "uploads", label: "Products" }]}
              format={count}
              views={["bar", "numbers"]}
              labelHeader="Craft"
            />
          </div>

          <Card
            title="Latest uploads"
            actions={
              <Link href="/editor/products" className="text-sm text-cobalt underline underline-offset-4">
                All my products
              </Link>
            }
          >
            {!recent.data ? (
              <Loading />
            ) : recent.data.results.length === 0 ? (
              <p className="text-muted">Nothing yet. Your first product is one click away.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
                {recent.data.results.map((p) => (
                  <li key={p.id}>
                    <ProductVisual name={p.name} slug={p.slug} image={p.image_url} category={p.category_slug} className="rounded-md" />
                    <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                    <p className="text-[13px] text-muted">{relative(p.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="text-sm text-muted">
            {data.profile.position || "Content editor"} since {shortDate(data.profile.joined)}. Last upload{" "}
            {relative(me.last_upload).toLowerCase()}.
          </p>
        </div>
      )}
    </>
  );
}
