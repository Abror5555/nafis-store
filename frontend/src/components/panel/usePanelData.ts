"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { errorMessage } from "@/lib/format";

/**
 * Loads panel data with the signed-in user's token.
 * While a new URL loads, the previous data stays on screen (marked `refreshing`)
 * so charts dim instead of flashing empty.
 */
export function usePanelData<T>(url: string | null, { pollMs }: { pollMs?: number } = {}) {
  const { authFetch, user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(url);

  const load = useCallback(
    async (quiet = false) => {
      if (!url || !user) return;
      latest.current = url;
      if (!quiet) setRefreshing(true);
      try {
        const response = await authFetch(url);
        const body = await response.json().catch(() => null);
        if (latest.current !== url) return;
        if (!response.ok) throw new Error(errorMessage(body, `The server answered ${response.status}.`));
        setData(body as T);
        setError(null);
      } catch (e) {
        if (latest.current === url) setError(e instanceof Error ? e.message : "Couldn't load this page.");
      } finally {
        if (latest.current === url) setRefreshing(false);
      }
    },
    [url, user, authFetch],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching on URL change is the point of this hook
    load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const timer = window.setInterval(() => load(true), pollMs);
    return () => window.clearInterval(timer);
  }, [load, pollMs]);

  return { data, error, refreshing, reload: () => load(true) };
}

/** Sends a JSON or multipart request with the user's token and returns the parsed body or throws. */
export function useSend() {
  const { authFetch } = useAuth();
  return useCallback(
    async <T = unknown>(url: string, method: string, body?: FormData | object): Promise<T> => {
      const isForm = typeof FormData !== "undefined" && body instanceof FormData;
      const response = await authFetch(url, {
        method,
        headers: isForm || body === undefined ? undefined : { "Content-Type": "application/json" },
        body: isForm ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(errorMessage(data, `The server answered ${response.status}.`)) as Error & {
          fields?: Record<string, string[]>;
        };
        if (data && typeof data === "object") error.fields = data as Record<string, string[]>;
        throw error;
      }
      return data as T;
    },
    [authFetch],
  );
}
