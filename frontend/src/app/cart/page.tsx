import type { Metadata } from "next";

import CartView from "./CartView";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">Your cart</h1>
      <CartView />
    </div>
  );
}
