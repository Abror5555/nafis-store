import type { Metadata } from "next";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

import ClearCart from "./ClearCart";

export const metadata: Metadata = { title: "Order placed" };

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOrder(id: string): Promise<Order | null> {
  if (!UUID.test(id)) return null;
  try {
    const response = await fetch(`${API_URL}/api/orders/${id}/`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as Order) : null;
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { order: raw } = await searchParams;
  const order = typeof raw === "string" ? await getOrder(raw) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-4xl">We couldn&apos;t find that order</h1>
        <p className="mt-4 text-lg text-muted">Check the link in your confirmation, or see all orders in your account.</p>
        <Link href="/account" className="btn-primary mt-8 h-12 px-7">
          Go to your account
        </Link>
      </div>
    );
  }

  const awaitingCard = order.payment_method === "card" && order.status === "pending";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <ClearCart />
      <p className="text-[15px] text-ishqor-text">Order {order.number}</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Thank you, {order.full_name.split(" ")[0]}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {order.status === "cancelled"
          ? "This order was cancelled and nothing was charged."
          : awaitingCard
          ? "Stripe is confirming your payment. Refresh this page in a moment to see it marked as paid."
          : order.payment_method === "cod"
            ? `Your order is placed. You'll pay ${formatPrice(order.total)} in cash when it arrives in ${order.city}.`
            : `Payment received. Your order is being packed for ${order.city}, ${order.country}.`}
      </p>

      <div className="mt-10 rounded-lg border border-line bg-surface p-6">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.product_slug} className="flex justify-between gap-4 py-3 text-[15px]">
              <span>
                {item.product_name} <span className="text-muted">× {item.quantity}</span>
              </span>
              <span className="tabular-nums">{formatPrice(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="tabular-nums">{Number(order.shipping) === 0 ? "Free" : formatPrice(order.shipping)}</dd>
          </div>
          <div className="flex justify-between text-lg font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Status</dt>
            <dd>{order.status_display}</dd>
          </div>
        </dl>
      </div>

      <Link href="/products" className="btn-secondary mt-10 h-12 px-7">
        Continue shopping
      </Link>
    </div>
  );
}
