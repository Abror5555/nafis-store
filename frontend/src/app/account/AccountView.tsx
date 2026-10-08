"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, Paginated } from "@/lib/types";

const STATUS_TONE: Record<Order["status"], string> = {
  pending: "bg-saffron/15 text-ink",
  paid: "bg-ishqor/15 text-ishqor-text",
  shipped: "bg-cobalt/10 text-cobalt",
  delivered: "bg-ishqor/15 text-ishqor-text",
  cancelled: "bg-madder/10 text-madder",
};

export default function AccountView() {
  const { user, ready, logout, authFetch } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    authFetch("/api/orders/mine/")
      .then((r) => (r.ok ? (r.json() as Promise<Paginated<Order>>) : Promise.reject()))
      .then((data) => setOrders(data.results))
      .catch(() => setError(true));
  }, [user, authFetch]);

  if (!ready || !user) return <p className="mx-auto max-w-4xl px-4 py-16 text-muted sm:px-6">Loading your account…</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Hello, {user.first_name}</h1>
          <p className="mt-2 text-muted">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="btn-secondary h-11 px-6"
        >
          Sign out
        </button>
      </div>

      <h2 className="mt-14 font-display text-3xl">Your orders</h2>
      {error && <p className="mt-4 text-madder">Orders couldn&apos;t be loaded. Reload the page to try again.</p>}
      {!error && orders === null && <p className="mt-4 text-muted">Loading orders…</p>}
      {orders?.length === 0 && (
        <div className="mt-4">
          <p className="text-muted">You haven&apos;t placed an order yet.</p>
          <Link href="/products" className="btn-primary mt-6 h-12 px-7">
            Browse products
          </Link>
        </div>
      )}
      {orders && orders.length > 0 && (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.public_id} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/checkout/success?order=${order.public_id}`}
                    className="font-medium hover:underline hover:underline-offset-4"
                  >
                    Order {order.number}
                  </Link>
                  <p className="text-sm text-muted">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-3 py-1 text-sm ${STATUS_TONE[order.status]}`}>
                    {order.status_display}
                  </span>
                  <span className="tabular-nums">{formatPrice(order.total)}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                {order.items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
