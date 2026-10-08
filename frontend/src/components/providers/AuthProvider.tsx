"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { errorMessage } from "@/lib/format";
import type { User } from "@/lib/types";

type Tokens = { access: string; refresh: string };

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, email: string, password: string) => Promise<void>;
  adoptSession: (session: { access: string; refresh: string; user: User }) => void;
  logout: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const STORAGE_KEY = "nafis-auth-v1";
const AuthContext = createContext<AuthContextValue | null>(null);

function loadTokens(): Tokens | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: Tokens | null) {
  try {
    if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Email or password is incorrect.");
    if (response.status === 429) throw new Error("Too many attempts. Wait a minute and try again.");
    throw new Error(errorMessage(data));
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const updateTokens = useCallback((next: Tokens | null) => {
    saveTokens(next);
    setTokens(next);
    if (!next) setUser(null);
  }, []);

  const refreshAccess = useCallback(
    async (current: Tokens): Promise<Tokens | null> => {
      try {
        const data = await postJson("/api/auth/refresh/", { refresh: current.refresh });
        const next = { access: data.access, refresh: data.refresh ?? current.refresh };
        updateTokens(next);
        return next;
      } catch {
        updateTokens(null);
        return null;
      }
    },
    [updateTokens],
  );

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const send = (access?: string) =>
        fetch(path, {
          ...init,
          headers: { ...(init.headers ?? {}), ...(access ? { Authorization: `Bearer ${access}` } : {}) },
        });
      const current = tokens ?? loadTokens();
      let response = await send(current?.access);
      if (response.status === 401 && current) {
        const next = await refreshAccess(current);
        if (next) response = await send(next.access);
      }
      return response;
    },
    [tokens, refreshAccess],
  );

  // Restore the session on first load.
  useEffect(() => {
    const stored = loadTokens();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing stored, mark auth as resolved
      setReady(true);
      return;
    }
    setTokens(stored);
    (async () => {
      let response = await fetch("/api/auth/me/", { headers: { Authorization: `Bearer ${stored.access}` } });
      if (response.status === 401) {
        const next = await refreshAccess(stored);
        if (next) response = await fetch("/api/auth/me/", { headers: { Authorization: `Bearer ${next.access}` } });
      }
      if (response.ok) setUser(await response.json());
      setReady(true);
    })().catch(() => setReady(true));
  }, [refreshAccess]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await postJson("/api/auth/login/", { email, password });
      const next = { access: data.access, refresh: data.refresh };
      updateTokens(next);
      const me = await fetch("/api/auth/me/", { headers: { Authorization: `Bearer ${next.access}` } });
      if (me.ok) setUser(await me.json());
    },
    [updateTokens],
  );

  const register = useCallback(
    async (firstName: string, email: string, password: string) => {
      const data = await postJson("/api/auth/register/", { first_name: firstName, email, password });
      updateTokens({ access: data.access, refresh: data.refresh });
      setUser(data.user);
    },
    [updateTokens],
  );

  /** Used after sign-ups that return tokens directly, such as firm registration. */
  const adoptSession = useCallback(
    (session: { access: string; refresh: string; user: User }) => {
      updateTokens({ access: session.access, refresh: session.refresh });
      setUser(session.user);
    },
    [updateTokens],
  );

  const logout = useCallback(() => updateTokens(null), [updateTokens]);

  const value = useMemo(
    () => ({ user, ready, login, register, adoptSession, logout, authFetch }),
    [user, ready, login, register, adoptSession, logout, authFetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
