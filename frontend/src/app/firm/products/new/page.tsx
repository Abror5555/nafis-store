"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/panel/PanelShell";
import ProductForm from "@/components/panel/ProductForm";
import type { FirmProfile } from "@/components/panel/types";
import { usePanelData } from "@/components/panel/usePanelData";

export default function FirmNewProduct() {
  const { data: firm } = usePanelData<FirmProfile>("/api/firm/me/");
  const [saved, setSaved] = useState<{ name: string; slug: string; is_active: boolean } | null>(null);

  return (
    <>
      <PageHeader
        title="Add a product"
        description={
          <>
            Products appear in the store under your firm&apos;s name. Your statistics stay on the{" "}
            <Link href="/firm" className="text-cobalt underline underline-offset-4">
              dashboard
            </Link>
            .
          </>
        }
      />
      {saved && (
        <p role="status" className="mb-6 rounded-lg border border-ishqor/40 bg-ishqor/5 px-4 py-3 text-[15px]">
          &ldquo;{saved.name}&rdquo; is saved.{" "}
          {saved.is_active && (
            <Link href={`/products/${saved.slug}`} className="text-cobalt underline underline-offset-4">
              See it in the store
            </Link>
          )}
        </p>
      )}
      {firm && (
        <ProductForm
          endpoint="/api/firm/products/"
          submitLabel="Save product"
          defaultOrigin={firm.city}
          onSaved={(p) => setSaved(p)}
        />
      )}
    </>
  );
}
