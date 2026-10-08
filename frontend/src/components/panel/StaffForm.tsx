"use client";

import { useState } from "react";

import { useSend } from "./usePanelData";

const FIELDS = [
  { name: "first_name", label: "First name", autoComplete: "off" },
  { name: "last_name", label: "Last name", autoComplete: "off" },
  { name: "email", label: "Work email", type: "email", autoComplete: "off" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+998 90 123 45 67" },
  { name: "position", label: "Job title (optional)" },
  { name: "password", label: "Temporary password", type: "password", autoComplete: "new-password" },
] as const;

/** Creates an operator or content editor account. They sign in on the normal sign-in page. */
export default function StaffForm({
  endpoint,
  kind,
  onCreated,
}: {
  endpoint: string;
  kind: string;
  onCreated: (email: string) => void;
}) {
  const send = useSend();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await send<{ email: string }>(endpoint, "POST", body);
      form.reset();
      onCreated(result.email);
    } catch (e) {
      const fields = (e as { fields?: Record<string, string[] | string> }).fields ?? {};
      const mapped: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = fields[f.name];
        if (v) mapped[f.name] = Array.isArray(v) ? v.join(" ") : String(v);
      }
      setErrors(mapped);
      if (!Object.keys(mapped).length) setFormError(e instanceof Error ? e.message : "Couldn't create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-[15px] text-muted">
        The new {kind} signs in on the store&apos;s sign-in page with this email and password and lands in their own
        panel. They can&apos;t open the owner panel or Django admin.
      </p>
      {formError && <p role="alert" className="text-sm text-madder">{formError}</p>}
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={`staff-${f.name}`} className="field-label">
            {f.label}
          </label>
          <input
            id={`staff-${f.name}`}
            name={f.name}
            type={"type" in f ? f.type : "text"}
            placeholder={"placeholder" in f ? f.placeholder : undefined}
            autoComplete={"autoComplete" in f ? f.autoComplete : undefined}
            aria-invalid={errors[f.name] ? true : undefined}
            className={`field ${errors[f.name] ? "border-madder" : ""}`}
          />
          {errors[f.name] && <p className="mt-1 text-sm text-madder">{errors[f.name]}</p>}
        </div>
      ))}
      <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
        {busy ? "Creating account…" : `Create ${kind} account`}
      </button>
    </form>
  );
}
