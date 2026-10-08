"use client";

import { useEffect } from "react";

import { useCart } from "@/components/providers/CartProvider";

/** Empties the cart once the visitor lands on a confirmed order (e.g. after Stripe). */
export default function ClearCart() {
  const { ready, clear } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
