"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import OrderSummary from "@/components/OrderSummary";
import ProductVisual from "@/components/ProductVisual";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useStoreConfig } from "@/components/providers/ConfigProvider";
import { errorMessage, formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type FieldErrors = Record<string, string>;

const FIELDS = [
  { name: "full_name", label: "Full name", autoComplete: "name", required: true, span: 2 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", required: true, placeholder: "+998 90 123 45 67" },
  { name: "country", label: "Country", autoComplete: "country-name", required: true },
  { name: "city", label: "City", autoComplete: "address-level2", required: true },
  { name: "address", label: "Street and house", autoComplete: "street-address", required: true, span: 2 },
  { name: "postal_code", label: "Postal code (optional)", autoComplete: "postal-code" },
] as const;

export default function CheckoutForm() {
  const router = useRouter();
  const config = useStoreConfig();
  const { user, authFetch } = useAuth();
  const { lines, ready, subtotal, clear } = useCart();
  const [method, setMethod] = useState<PaymentMethod>(config.payment_methods[0] ?? "cod");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  if (!ready) return <p className="mt-10 text-muted">Loading your cart…</p>;

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-lg">
        <p className="text-lg text-muted">There is nothing to check out yet.</p>
        <Link href="/products" className="btn-primary mt-6 h-12 px-7">
          Browse products
        </Link>
      </div>
    );
  }

  const soldOut = lines.filter((l) => l.stock === 0 || l.quantity === 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (soldOut.length) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(form.entries()),
      payment_method: method,
      items: lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
    };

    try {
      const response = await authFetch("/api/orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many orders from this connection. Try again later.");
        const errors: FieldErrors = {};
        for (const field of FIELDS) {
          const value = data?.[field.name];
          if (value) errors[field.name] = Array.isArray(value) ? value.join(" ") : String(value);
        }
        setFieldErrors(errors);
        const rest = data && typeof data === "object"
          ? Object.fromEntries(Object.entries(data).filter(([k]) => !(k in errors)))
          : null;
        throw new Error(
          Object.keys(errors).length && (!rest || !Object.keys(rest).length)
            ? "Check the highlighted fields."
            : errorMessage(rest),
        );
      }

      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }
      clear();
      router.push(`/checkout/success?order=${data.order.public_id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "The order could not be placed. Try again.");
      setSubmitting(false);
    }
  }

  const methods: { value: PaymentMethod; label: string; hint: string }[] = [
    { value: "card", label: "Card", hint: "Pay securely on Stripe. Test mode: use card 4242 4242 4242 4242." },
    { value: "cod", label: "Cash on delivery", hint: "Pay the courier when the parcel arrives." },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-10">
        {formError && (
          <p role="alert" className="rounded-md border border-madder/40 bg-madder/5 px-4 py-3 text-[15px] text-madder">
            {formError}
          </p>
        )}

        <fieldset>
          <legend className="font-display text-2xl">Contact and delivery</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {FIELDS.map((field) => {
              const error = fieldErrors[field.name];
              const id = `checkout-${field.name}`;
              const defaultValue =
                field.name === "full_name" ? user?.first_name : field.name === "email" ? user?.email : undefined;
              return (
                <div key={field.name} className={"span" in field && field.span === 2 ? "sm:col-span-2" : undefined}>
                  <label htmlFor={id} className="field-label">
                    {field.label}
                  </label>
                  <input
                    id={id}
                    name={field.name}
                    type={"type" in field ? field.type : "text"}
                    autoComplete={field.autoComplete}
                    required={"required" in field && field.required}
                    placeholder={"placeholder" in field ? field.placeholder : undefined}
                    defaultValue={defaultValue}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`field ${error ? "border-madder" : ""}`}
                  />
                  {error && (
                    <p id={`${id}-error`} className="mt-1.5 text-sm text-madder">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="sm:col-span-2">
              <label htmlFor="checkout-note" className="field-label">
                Note for the shop (optional)
              </label>
              <textarea id="checkout-note" name="note" rows={3} maxLength={500} className="field" />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-2xl">Payment</legend>
          <div className="mt-5 space-y-3">
            {methods
              .filter((m) => config.payment_methods.includes(m.value))
              .map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border bg-surface p-4 ${
                    method === m.value ? "border-cobalt ring-1 ring-cobalt" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="mt-1 accent-cobalt"
                  />
                  <span>
                    <span className="block font-medium">{m.label}</span>
                    <span className="mt-0.5 block text-sm text-muted">{m.hint}</span>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal}>
          <ul className="mt-6 space-y-3 border-t border-line pt-5">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 text-sm">
                <ProductVisual
                  name={line.name}
                  slug={line.slug}
                  image={line.image}
                  category={line.category}
                  className="w-12 shrink-0 rounded"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{line.name}</span>
                  <span className="text-muted">Qty {line.quantity}</span>
                </span>
                <span className="tabular-nums">{formatPrice(Number.parseFloat(line.price) * line.quantity)}</span>
              </li>
            ))}
          </ul>
          {soldOut.length > 0 && (
            <p role="alert" className="mt-4 text-sm text-madder">
              Some items sold out. <Link href="/cart" className="underline">Remove them in your cart</Link> to continue.
            </p>
          )}
          <button type="submit" disabled={submitting || soldOut.length > 0} className="btn-primary mt-6 h-12 w-full">
            {submitting ? "Placing order…" : method === "card" ? "Continue to payment" : "Place order"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Demo store: no real orders are shipped or charged.</p>
        </OrderSummary>
      </div>
    </form>
  );
}
