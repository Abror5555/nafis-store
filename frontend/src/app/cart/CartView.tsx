"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import OrderSummary from "@/components/OrderSummary";
import ProductVisual from "@/components/ProductVisual";
import { MAX_PER_LINE, useCart } from "@/components/providers/CartProvider";
import QuantityStepper from "@/components/QuantityStepper";
import { formatPrice } from "@/lib/format";
import type { Paginated, Product } from "@/lib/types";

export default function CartView() {
  const { lines, ready, subtotal, setQuantity, remove, refresh } = useCart();
  const refreshed = useRef(false);

  // Re-check prices and stock once, in case they changed since items were added.
  useEffect(() => {
    if (!ready || refreshed.current || lines.length === 0) return;
    refreshed.current = true;
    const ids = lines.map((l) => l.id).join(",");
    fetch(`/api/products/?ids=${ids}&page_size=50`)
      .then((r) => (r.ok ? (r.json() as Promise<Paginated<Product>>) : null))
      .then((data) => data && refresh(data.results))
      .catch(() => undefined);
  }, [ready, lines, refresh]);

  if (!ready) {
    return <p className="mt-10 text-muted">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-lg">
        <p className="text-lg text-muted">Your cart is empty. Plates, scarves and suzani are waiting in the shop.</p>
        <Link href="/products" className="btn-primary mt-6 h-12 px-7">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-4 py-5 sm:gap-6">
            <Link href={`/products/${line.slug}`} className="w-24 shrink-0 sm:w-28">
              <ProductVisual
                name={line.name}
                slug={line.slug}
                image={line.image}
                category={line.category}
                className="rounded-md"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/products/${line.slug}`} className="font-medium hover:underline hover:underline-offset-4">
                    {line.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {line.origin}. {formatPrice(line.price)} each
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{formatPrice(Number.parseFloat(line.price) * line.quantity)}</p>
              </div>
              <div className="mt-auto flex items-center gap-4 pt-4">
                {line.stock > 0 ? (
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    max={Math.min(line.stock, MAX_PER_LINE)}
                    onChange={(q) => setQuantity(line.id, q)}
                    label={`Quantity of ${line.name}`}
                  />
                ) : (
                  <p className="text-sm text-madder">Sold out since you added it</p>
                )}
                <button
                  type="button"
                  onClick={() => remove(line.id)}
                  className="text-sm text-muted underline underline-offset-4 hover:text-madder"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal}>
          <Link href="/checkout" className="btn-primary mt-6 h-12 w-full">
            Go to checkout
          </Link>
          <Link href="/products" className="mt-4 block text-center text-sm text-cobalt underline underline-offset-4">
            Keep shopping
          </Link>
        </OrderSummary>
      </div>
    </div>
  );
}
