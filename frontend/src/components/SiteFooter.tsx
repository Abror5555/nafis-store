import Link from "next/link";

import { formatPrice, STORE_NAME } from "@/lib/format";
import type { StoreConfig } from "@/lib/types";

import IkatBand from "./IkatBand";

export default function SiteFooter({ config }: { config: StoreConfig }) {
  return (
    <footer className="mt-24">
      <IkatBand />
      <div className="bg-ink text-porcelain">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-3xl">{STORE_NAME}</p>
            <p className="mt-3 text-sm leading-relaxed text-porcelain/75">
              Ceramics, silk and embroidery from workshops in Uzbekistan, sent from Tashkent to anywhere in the world.
            </p>
          </div>
          <nav aria-label="Shop">
            <h2 className="text-sm text-porcelain/60">Shop</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/products" className="hover:underline">All products</Link></li>
              <li><Link href="/products?category=ceramics" className="hover:underline">Ceramics</Link></li>
              <li><Link href="/products?category=silk" className="hover:underline">Silk</Link></li>
              <li><Link href="/cart" className="hover:underline">Your cart</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="text-sm text-porcelain/60">Ordering</h2>
            <ul className="mt-3 space-y-2 text-sm text-porcelain/85">
              <li>Free shipping over {formatPrice(config.free_shipping_threshold)}</li>
              <li>{config.payment_methods.includes("card") ? "Card or cash on delivery" : "Cash on delivery"}</li>
              <li><Link href="/account" className="hover:underline">Order history</Link></li>
              <li><Link href="/firm/register" className="hover:underline">Sell on {STORE_NAME}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-porcelain/15">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-porcelain/60 sm:px-6">
            This is a demo store built as a portfolio project. Orders placed here are not shipped or charged.
          </p>
        </div>
      </div>
    </footer>
  );
}
