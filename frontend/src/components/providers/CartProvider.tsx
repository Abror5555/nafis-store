"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Product } from "@/lib/types";

export type CartLine = {
  id: number;
  slug: string;
  name: string;
  price: string;
  image: string | null;
  category: string;
  origin: string;
  stock: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  refresh: (products: Product[]) => void;
  lastAdded: { name: string; at: number } | null;
};

const STORAGE_KEY = "nafis-cart-v1";
export const MAX_PER_LINE = 20;

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === "number") : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartContextValue["lastAdded"]>(null);

  // Load once on the client; the server always renders an empty cart.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage after mount
    setLines(readStorage());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [lines, ready]);

  const add = useCallback((product: Product, quantity = 1) => {
    setLines((current) => {
      const limit = Math.min(product.stock, MAX_PER_LINE);
      const existing = current.find((l) => l.id === product.id);
      if (existing) {
        return current.map((l) =>
          l.id === product.id ? { ...l, stock: product.stock, quantity: Math.min(l.quantity + quantity, limit) } : l,
        );
      }
      return [
        ...current,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category.slug,
          origin: product.origin,
          stock: product.stock,
          quantity: Math.min(quantity, limit),
        },
      ];
    });
    setLastAdded({ name: product.name, at: Date.now() });
  }, []);

  const setQuantity = useCallback((id: number, quantity: number) => {
    setLines((current) =>
      current.map((l) =>
        l.id === id ? { ...l, quantity: Math.max(1, Math.min(quantity, l.stock, MAX_PER_LINE)) } : l,
      ),
    );
  }, []);

  const remove = useCallback((id: number) => setLines((current) => current.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  /** Update names, prices and stock from fresh API data; drop products that disappeared. */
  const refresh = useCallback((products: Product[]) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setLines((current) =>
      current
        .filter((l) => byId.has(l.id))
        .map((l) => {
          const p = byId.get(l.id)!;
          return {
            ...l,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.image,
            stock: p.stock,
            quantity: Math.min(l.quantity, Math.max(p.stock, 0), MAX_PER_LINE),
          };
        }),
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + Number.parseFloat(l.price) * l.quantity, 0);
    return { lines, ready, count, subtotal, add, setQuantity, remove, clear, refresh, lastAdded };
  }, [lines, ready, add, setQuantity, remove, clear, refresh, lastAdded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
