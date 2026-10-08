"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "", label: "Featured" },
  { value: "-created_at", label: "Newest" },
  { value: "price", label: "Price, low to high" },
  { value: "-price", label: "Price, high to low" },
];

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort by</span>
      <select
        value={params.get("ordering") ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("ordering", e.target.value);
          else next.delete("ordering");
          next.delete("page");
          router.push(`${pathname}${next.size ? `?${next}` : ""}`);
        }}
        className="h-10 rounded-full border border-line bg-surface px-3 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
