"use client";

import { usePathname } from "next/navigation";

import { FirmShell } from "@/components/panel/shells";

/** Registration is public; everything else under /firm is the signed-in seller centre. */
export default function FirmArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/firm/register") return <>{children}</>;
  return <FirmShell>{children}</FirmShell>;
}
