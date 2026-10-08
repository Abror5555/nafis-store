"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { formatPrice } from "@/lib/format";

type PurchaseContextValue = { quantity: number; setQuantity: (quantity: number) => void };

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

/** Shares the chosen quantity between the price display and the add-to-cart controls. */
export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [quantity, setQuantity] = useState(1);
  const value = useMemo(() => ({ quantity, setQuantity }), [quantity]);
  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase() {
  const context = useContext(PurchaseContext);
  if (!context) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return context;
}

/** The product price, multiplied by the selected quantity. */
export function LivePrice({ unitPrice }: { unitPrice: string }) {
  const { quantity } = usePurchase();
  const unit = Number.parseFloat(unitPrice);
  return (
    <p className="mt-4 flex flex-wrap items-baseline gap-x-3" aria-live="polite">
      <span key={quantity} className="price-tick text-2xl tabular-nums">
        {formatPrice(unit * quantity)}
      </span>
      {quantity > 1 && (
        <span className="text-[15px] text-muted">
          {quantity} × {formatPrice(unit)} each
        </span>
      )}
    </p>
  );
}
