"use client";

import { formatPrice } from "@/lib/format";

import { useStoreConfig } from "./providers/ConfigProvider";

export function shippingFor(subtotal: number, threshold: number, flat: number) {
  return subtotal === 0 || subtotal >= threshold ? 0 : flat;
}

export default function OrderSummary({ subtotal, children }: { subtotal: number; children?: React.ReactNode }) {
  const config = useStoreConfig();
  const shipping = shippingFor(subtotal, config.free_shipping_threshold, config.flat_shipping_rate);
  const missing = config.free_shipping_threshold - subtotal;

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-2xl">Summary</h2>
      <dl className="mt-5 space-y-3 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd className="tabular-nums">{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-lg font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(subtotal + shipping)}</dd>
        </div>
      </dl>
      {missing > 0 && subtotal > 0 && (
        <p className="mt-4 rounded-md bg-tint px-3 py-2 text-sm">
          Add {formatPrice(missing)} more for free shipping.
        </p>
      )}
      {children}
    </div>
  );
}
