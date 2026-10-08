"use client";

import { usePathname } from "next/navigation";

export const PANEL_PREFIXES = ["/boss", "/operator", "/editor", "/firm"];

export function isPanelPath(pathname: string | null) {
  return !!pathname && PANEL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Renders the shop's header, footer and assistant everywhere except inside the work panels. */
export default function StoreOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isPanelPath(pathname) ? null : <>{children}</>;
}
