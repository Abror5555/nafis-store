"use client";

import Link from "next/link";

import { UploadIcon } from "@/components/icons";
import OwnProductsList from "@/components/panel/OwnProductsList";
import { PageHeader } from "@/components/panel/PanelShell";

export default function FirmProducts() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Everything your firm sells in the store. Select a product to update its photo, price, stock or description."
        actions={
          <Link href="/firm/products/new" className="btn-primary h-10 px-5">
            <UploadIcon width={18} height={18} /> Add a product
          </Link>
        }
      />
      <OwnProductsList endpoint="/api/firm/products/" />
    </>
  );
}
