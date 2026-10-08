"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "./providers/AuthProvider";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("next")?.startsWith("/") ? params.get("next")! : null;
  const next = requested ?? "/account";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Once signed in, go where the visitor was heading, or to the panel for their kind of account.
  useEffect(() => {
    if (ready && user) router.replace(requested ?? user.panel ?? "/account");
  }, [ready, user, router, requested]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(String(form.get("first_name") ?? ""), email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl">{isLogin ? "Sign in" : "Create an account"}</h1>
      <p className="mt-3 text-muted">
        {isLogin ? "See your orders and check out faster." : "Keep track of your orders in one place."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && (
          <p role="alert" className="rounded-md border border-madder/40 bg-madder/5 px-4 py-3 text-[15px] text-madder">
            {error}
          </p>
        )}
        {!isLogin && (
          <div>
            <label htmlFor="first_name" className="field-label">
              First name
            </label>
            <input id="first_name" name="first_name" required autoComplete="given-name" className="field" />
          </div>
        )}
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            aria-describedby={isLogin ? undefined : "password-hint"}
            className="field"
          />
          {!isLogin && (
            <p id="password-hint" className="mt-1.5 text-sm text-muted">
              At least 8 characters, not only numbers.
            </p>
          )}
        </div>
        <button type="submit" disabled={submitting} className="btn-primary h-12 w-full">
          {submitting ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-[15px] text-muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link
          href={`${isLogin ? "/register" : "/login"}${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-cobalt underline underline-offset-4"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
