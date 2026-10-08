import type { Metadata } from "next";

import { OperatorShell } from "@/components/panel/shells";

export const metadata: Metadata = { title: { default: "Operator desk", template: "%s | Operator desk" }, robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperatorShell>{children}</OperatorShell>;
}
