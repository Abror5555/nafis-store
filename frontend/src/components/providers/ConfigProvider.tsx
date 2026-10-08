"use client";

import { createContext, useContext } from "react";

import type { StoreConfig } from "@/lib/types";

const ConfigContext = createContext<StoreConfig | null>(null);

export function ConfigProvider({ config, children }: { config: StoreConfig; children: React.ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useStoreConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useStoreConfig must be used inside <ConfigProvider>");
  return context;
}
