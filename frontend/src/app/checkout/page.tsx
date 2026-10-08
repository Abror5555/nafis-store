import type { Metadata } from "next";

import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { cancelled } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">Checkout</h1>
      {cancelled && (
        <p role="status" className="mt-6 max-w-2xl rounded-md border border-line bg-surface px-4 py-3 text-[15px]">
          Card payment was cancelled and nothing was charged. Your cart is still here, so you can try again or choose
          cash on delivery.
        </p>
      )}
      <CheckoutForm />
    </div>
  );
}
