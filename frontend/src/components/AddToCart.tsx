"use client";

import type { Product } from "@/lib/types";

import { MAX_PER_LINE, useCart } from "./providers/CartProvider";
import { usePurchase } from "./PurchaseProvider";
import QuantityStepper from "./QuantityStepper";

export default function AddToCart({ product }: { product: Product }) {
  const { add, lines } = useCart();
  const { quantity, setQuantity } = usePurchase();
  const inCart = lines.find((l) => l.id === product.id)?.quantity ?? 0;
  const available = Math.max(0, Math.min(product.stock, MAX_PER_LINE) - inCart);
  const chosen = Math.min(quantity, Math.max(available, 1));

  if (!product.in_stock) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[15px]">
        Sold out. Each piece is made by hand, so new stock arrives in small batches.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper
        value={chosen}
        min={1}
        max={Math.max(available, 1)}
        onChange={setQuantity}
        label={`Quantity of ${product.name}`}
      />
      <button
        type="button"
        disabled={available === 0}
        onClick={() => {
          add(product, Math.min(chosen, available));
          setQuantity(1);
        }}
        className="btn-primary h-12 flex-1 px-8 sm:flex-none"
      >
        Add to cart
      </button>
      {inCart > 0 && (
        <p className="w-full text-sm text-muted">
          {available === 0 ? `All ${product.stock} available are in your cart.` : `${inCart} already in your cart.`}
        </p>
      )}
    </div>
  );
}
