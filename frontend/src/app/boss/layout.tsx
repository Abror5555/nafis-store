import type { Metadata } from "next";

import { BossShell } from "@/components/panel/shells";

export const metadata: Metadata = { title: { default: "Owner panel", template: "%s | Owner panel" }, robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BossShell>{children}</BossShell>;
}
