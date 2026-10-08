import type { Metadata } from "next";

import { EditorShell } from "@/components/panel/shells";

export const metadata: Metadata = { title: { default: "Content desk", template: "%s | Content desk" }, robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <EditorShell>{children}</EditorShell>;
}
