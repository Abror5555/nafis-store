import "@fontsource/young-serif/400.css";
import "@fontsource-variable/onest";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import AssistantWidget from "@/components/AssistantWidget";
import { AssistantProvider } from "@/components/providers/AssistantProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import { ConfigProvider } from "@/components/providers/ConfigProvider";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import StoreOnly from "@/components/StoreOnly";
import { getCategories, getStoreConfig } from "@/lib/api";
import { STORE_NAME } from "@/lib/format";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: {
    default: `${STORE_NAME}: handmade crafts from Uzbekistan`,
    template: `%s | ${STORE_NAME}`,
  },
  description:
    "Rishtan ceramics, Margilan silk, suzani and ikat textiles from Uzbek workshops, shipped worldwide from Tashkent.",
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [config, categories] = await Promise.all([
    getStoreConfig(),
    getCategories().catch((): Category[] => []),
  ]);

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-porcelain"
        >
          Skip to content
        </a>
        <ConfigProvider config={config}>
          <AuthProvider>
            <CartProvider>
              <AssistantProvider>
                <StoreOnly>
                  <SiteHeader categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))} />
                </StoreOnly>
                <main id="main">{children}</main>
                <StoreOnly>
                  <SiteFooter config={config} />
                  <AssistantWidget />
                </StoreOnly>
              </AssistantProvider>
            </CartProvider>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
