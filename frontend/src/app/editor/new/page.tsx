"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/panel/PanelShell";
import ProductForm from "@/components/panel/ProductForm";

export default function EditorNewProduct() {
  const [saved, setSaved] = useState<{ name: string; slug: string } | null>(null);
  return (
    <>
      <PageHeader
        title="Add a product"
        description="It goes into the store's own catalog and counts towards your uploads for today."
      />
      {saved && (
        <p role="status" className="mb-6 rounded-lg border border-ishqor/40 bg-ishqor/5 px-4 py-3 text-[15px]">
          &ldquo;{saved.name}&rdquo; is saved.{" "}
          <Link href={`/products/${saved.slug}`} className="text-cobalt underline underline-offset-4">
            See it in the store
          </Link>{" "}
          or add the next one below.
        </p>
      )}
      <ProductForm endpoint="/api/editor/products/" submitLabel="Save product" onSaved={(p) => setSaved(p)} />
    </>
  );
}
