import Link from "next/link";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

import ProductVisual from "./ProductVisual";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex flex-col">
      <ProductVisual
        name={product.name}
        slug={product.slug}
        image={product.image}
        category={product.category.slug}
        className="rounded-md"
      />
      <div className="mt-3 flex items-start justify-between gap-4">
        <h3 className="text-[15px] leading-snug font-medium">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>
        <p className="shrink-0 text-[15px] tabular-nums">{formatPrice(product.price)}</p>
      </div>
      <p className="mt-1 text-sm text-muted">{product.origin}</p>
      {!product.in_stock && <p className="mt-1 text-sm text-madder">Sold out</p>}
    </article>
  );
}
