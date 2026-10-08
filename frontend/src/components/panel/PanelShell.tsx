"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CloseIcon, LogoutIcon, MenuIcon, StoreIcon } from "@/components/icons";
import { useAuth } from "@/components/providers/AuthProvider";
import { STORE_NAME } from "@/lib/format";
import type { Role } from "@/lib/types";

import { initials } from "./format";

export type NavItem = { href: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

const ROLE_LABEL: Record<Role, string> = {
  boss: "Owner",
  operator: "Operator",
  editor: "Content editor",
  firm: "Partner firm",
  customer: "Customer",
};

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  nav,
  title,
  root,
  onNavigate,
}: {
  nav: NavItem[];
  title: string;
  root: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const name = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "";

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-8 pt-7">
        <Link href="/" className="font-display text-[28px] leading-none text-white">
          {STORE_NAME}
        </Link>
        <p className="mt-2 text-sm text-porcelain/60">{title}</p>
      </div>

      <nav aria-label={title} className="flex-1 px-3">
        <ul className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href, root);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
                    active ? "bg-white/10 text-white" : "text-porcelain/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && <span aria-hidden className="absolute left-0 top-2.5 h-6 w-[3px] rounded-r bg-saffron" />}
                  <Icon width={19} height={19} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {user && (
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ishqor text-sm font-medium text-white">
              {initials(name || "?")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{user.firm_name ?? name}</p>
              <p className="truncate text-xs text-porcelain/60">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/5 text-[13px] text-porcelain/80 hover:bg-white/10"
            >
              <StoreIcon width={15} height={15} /> Store
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/5 text-[13px] text-porcelain/80 hover:bg-white/10"
            >
              <LogoutIcon width={15} height={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PanelShell({
  role,
  title,
  nav,
  root,
  children,
}: {
  role: Role;
  title: string;
  nav: NavItem[];
  root: string;
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return <p className="p-10 text-muted">Opening your panel…</p>;
  }

  if (user.role !== role) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="font-display text-4xl">This panel isn&apos;t yours</h1>
        <p className="mt-4 text-lg text-muted">
          You&apos;re signed in as {user.email}, which doesn&apos;t have access to the {title.toLowerCase()}.
        </p>
        <Link href={user.panel} className="btn-primary mt-8 h-12 px-7">
          Go to your page
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-porcelain lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden bg-ink lg:block">
        <div className="sticky top-0 h-dvh">
          <Sidebar nav={nav} title={title} root={root} />
        </div>
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-ink px-4 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <span className="font-display text-xl">{STORE_NAME}</span>
        <span className="text-sm text-porcelain/60">{title}</span>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50" onClick={() => setMenuOpen(false)} />
          <div className="panel-slide absolute inset-y-0 left-0 w-[280px] bg-ink">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
            <Sidebar nav={nav} title={title} root={root} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
