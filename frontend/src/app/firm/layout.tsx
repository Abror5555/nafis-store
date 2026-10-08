import type { Metadata } from "next";

import FirmArea from "./FirmArea";

export const metadata: Metadata = { title: { default: "Seller centre", template: "%s | Seller centre" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FirmArea>{children}</FirmArea>;
}
