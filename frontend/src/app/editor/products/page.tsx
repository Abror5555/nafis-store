"use client";

import Link from "next/link";

import { UploadIcon } from "@/components/icons";
import OwnProductsList from "@/components/panel/OwnProductsList";
import { PageHeader } from "@/components/panel/PanelShell";

export default function EditorProducts() {
  return (
    <>
      <PageHeader
        title="My products"
        description="Everything you've added. Select a product to change its photo, price, stock or text."
        actions={
          <Link href="/editor/new" className="btn-primary h-10 px-5">
            <UploadIcon width={18} height={18} /> Add a product
          </Link>
        }
      />
      <OwnProductsList endpoint="/api/editor/products/" />
    </>
  );
}
