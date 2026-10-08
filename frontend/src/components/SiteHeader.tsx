"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { STORE_NAME } from "@/lib/format";
import type { CategoryRef } from "@/lib/types";

import { BagIcon, ChatIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import { useAssistant } from "./providers/AssistantProvider";
import { useAuth } from "./providers/AuthProvider";
import { useCart } from "./providers/CartProvider";

function CartLink() {
  const { count, ready, lastAdded } = useCart();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show a short confirmation after each add
    setNotice(lastAdded.name);
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [lastAdded]);

  return (
    <div className="relative">
      <Link
        href="/cart"
        className="relative flex h-10 items-center gap-2 rounded-full px-3 hover:bg-tint"
        aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      >
        <BagIcon />
        <span className="text-sm tabular-nums">{ready ? count : 0}</span>
      </Link>
      <div role="status" aria-live="polite" className="absolute right-0 top-12 z-40">
        {notice && (
          <div className="toast-in w-64 rounded-lg border border-line bg-surface p-4 text-sm shadow-[0_8px_30px_rgba(24,33,58,0.12)]">
            <p className="text-muted">Added to your cart</p>
            <p className="mt-1 font-medium">{notice}</p>
            <Link href="/cart" className="mt-3 inline-block text-cobalt underline underline-offset-4">
              View cart
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** On phones the floating assistant button would cover page content, so it lives in the header. */
function AssistantHeaderButton() {
  const { setOpen } = useAssistant();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-tint sm:hidden"
      aria-label="Ask the shop assistant"
    >
      <ChatIcon />
    </button>
  );
}

function AccountLink() {
  const { user, ready } = useAuth();
  return (
    <Link
      href={user ? (user.role === "customer" ? "/account" : user.panel) : "/login"}
      className="flex h-10 items-center gap-2 rounded-full px-3 hover:bg-tint"
      aria-label={user ? (user.role === "customer" ? "Your account" : "Open your panel") : "Sign in"}
    >
      <UserIcon />
      <span className="hidden text-sm lg:inline">
        {ready && user ? (user.role === "customer" ? user.first_name : "Your panel") : "Sign in"}
      </span>
    </Link>
  );
}

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/products" role="search" className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={18} />
      <input
        id="site-search"
        name="search"
        type="search"
        placeholder="Search silk, plates, suzani"
        className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-sm placeholder:text-muted/80"
      />
    </form>
  );
}

export default function SiteHeader({ categories }: { categories: CategoryRef[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu after navigation
    setMenuOpen(false);
  }, [pathname]);

  const links = [{ href: "/products", label: "Shop all" }, ...categories.map((c) => ({ href: `/products?category=${c.slug}`, label: c.name }))];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-porcelain/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <button
          type="button"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-tint lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link href="/" className="font-display text-[26px] leading-none tracking-tight">
          {STORE_NAME}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-6 text-[15px]">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-cobalt">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchForm className="mr-2 hidden w-64 md:block" />
          <AssistantHeaderButton />
          <AccountLink />
          <CartLink />
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-line bg-porcelain px-4 pb-6 pt-4 lg:hidden">
          <SearchForm className="mb-4 md:hidden" />
          <ul className="space-y-1 text-lg">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
