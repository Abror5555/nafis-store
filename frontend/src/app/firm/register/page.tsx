"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CheckIcon, ShieldIcon } from "@/components/icons";
import { PlateMotif } from "@/components/ProductArt";
import { useAuth } from "@/components/providers/AuthProvider";
import { errorMessage, STORE_NAME } from "@/lib/format";
import type { Category, User } from "@/lib/types";

type FieldDef = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  autoComplete?: string;
  span?: boolean;
  options?: { value: string; label: string }[];
  textarea?: boolean;
};

const LEGAL_FORMS = [
  { value: "llc", label: "Limited liability company (LLC)" },
  { value: "sole", label: "Sole proprietor" },
  { value: "jsc", label: "Joint-stock company" },
  { value: "other", label: "Other" },
];

const STEPS: { title: string; intro: string; fields: FieldDef[] }[] = [
  {
    title: "Your company",
    intro: "Tell us about the business that will sell through the store.",
    fields: [
      { name: "name", label: "Company name", placeholder: "Lojuvard Ceramics", span: true },
      { name: "legal_form", label: "Legal form", options: LEGAL_FORMS },
      { name: "tax_id", label: "Tax ID (STIR)", placeholder: "9 digits", hint: "Used for invoices and payouts." },
      { name: "main_category", label: "Main craft", optional: true },
      { name: "city", label: "City", placeholder: "Rishtan" },
      { name: "address", label: "Address", placeholder: "Street, house", span: true },
      { name: "phone", label: "Company phone", type: "tel", placeholder: "+998 90 123 45 67" },
      { name: "company_email", label: "Company email", type: "email", placeholder: "hello@yourcompany.uz" },
      { name: "website", label: "Website", type: "url", placeholder: "https://", optional: true, span: true },
      { name: "description", label: "About the workshop", optional: true, textarea: true, span: true },
    ],
  },
  {
    title: "The owner",
    intro: "We check the owner's identity once, before payouts start.",
    fields: [
      { name: "owner_full_name", label: "Full name", placeholder: "First and last name, as in the passport", span: true, autoComplete: "name" },
      { name: "owner_phone", label: "Personal phone", type: "tel", placeholder: "+998 90 123 45 67", autoComplete: "tel" },
      { name: "owner_birth_date", label: "Date of birth", type: "date", autoComplete: "bday" },
      { name: "passport_number", label: "Passport series and number", placeholder: "AA1234567", hint: "Two letters and seven digits." },
      { name: "passport_issue_date", label: "Date of issue", type: "date" },
      { name: "passport_issued_by", label: "Issued by", placeholder: "Department that issued the passport", span: true },
    ],
  },
  {
    title: "Your sign-in",
    intro: "You'll use this email and password to open your seller centre.",
    fields: [
      { name: "email", label: "Email for signing in", type: "email", autoComplete: "email", span: true },
      { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters, not only numbers.", span: true },
    ],
  },
];

const FIELD_STEP: Record<string, number> = Object.fromEntries(
  STEPS.flatMap((s, i) => s.fields.map((f) => [f.name, i])),
);

export default function FirmRegister() {
  const router = useRouter();
  const { adoptSession, user, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({ legal_form: "llc" });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories/")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const current = STEPS[step];

  function checkStep(index: number) {
    const missing: Record<string, string> = {};
    for (const f of STEPS[index].fields) {
      if (!f.optional && !values[f.name]?.trim()) missing[f.name] = "Fill in this field.";
    }
    if (index === 2 && !accept) missing.accept_terms = "Accept the seller terms to continue.";
    return missing;
  }

  async function next(event: React.FormEvent) {
    event.preventDefault();
    const missing = checkStep(step);
    setErrors(missing);
    if (Object.keys(missing).length) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...values, accept_terms: accept, main_category: values.main_category || null };
      const response = await fetch("/api/firms/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const fieldErrors: Record<string, string> = {};
        if (data && typeof data === "object") {
          for (const [k, v] of Object.entries(data)) fieldErrors[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setErrors(fieldErrors);
        const first = Object.keys(fieldErrors).find((k) => k in FIELD_STEP);
        if (first !== undefined) setStep(FIELD_STEP[first]);
        setFormError(response.status === 429 ? "Too many attempts. Wait a minute and try again." : errorMessage(data, "Registration failed. Check the fields."));
        return;
      }
      adoptSession(data as { access: string; refresh: string; user: User });
      router.push("/firm?welcome=1");
    } catch {
      setFormError("The server didn't answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (ready && user?.role === "firm") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="font-display text-4xl">You&apos;re already a seller</h1>
        <Link href="/firm" className="btn-primary mt-8 h-12 px-7">
          Open your seller centre
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-porcelain lg:grid lg:grid-cols-[minmax(320px,440px)_1fr]">
      <aside className="relative overflow-hidden bg-ink text-porcelain">
        <div className="relative z-10 px-8 py-10 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:px-12 lg:py-14">
        <Link href="/" className="font-display text-3xl text-white">
          {STORE_NAME}
        </Link>
        <p className="mt-1 text-sm text-porcelain/60">Seller centre</p>
        <h1 className="mt-12 font-display text-[40px] leading-[1.05] text-white lg:text-[48px]">
          Sell your craft to the world
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-porcelain/75">
          List your products next to Rishtan ceramics and Margilan silk. See what buyers want each month and how your
          own pieces sell.
        </p>
        <ol className="mt-12 space-y-4" aria-label="Registration steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  i < step ? "bg-ishqor text-white" : i === step ? "bg-saffron text-ink" : "border border-white/25 text-porcelain/60"
                }`}
              >
                {i < step ? <CheckIcon width={16} height={16} /> : i + 1}
              </span>
              <span className={i === step ? "text-white" : "text-porcelain/60"}>{s.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-12 flex max-w-sm gap-2 text-[13px] leading-relaxed text-porcelain/60">
          <ShieldIcon width={18} height={18} className="mt-0.5 shrink-0" />
          Passport details are encrypted and only used to verify the owner. Other sellers and customers never see them.
        </p>
        </div>
        <svg viewBox="0 0 400 400" aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 hidden h-[420px] w-[420px] opacity-[0.14] lg:block">
          <PlateMotif seed="seller-centre" />
        </svg>
      </aside>

      <main className="px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
        <form onSubmit={next} noValidate className="mx-auto max-w-2xl">
          <p className="text-sm text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 font-display text-4xl">{current.title}</h2>
          <p className="mt-2 text-muted">{current.intro}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-cobalt transition-[width] duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>

          {formError && (
            <p role="alert" className="mt-6 rounded-lg border border-madder/40 bg-madder/5 px-4 py-3 text-[15px] text-madder">
              {formError}
            </p>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {current.fields.map((f) => {
              const id = `firm-${f.name}`;
              const error = errors[f.name];
              const common = {
                id,
                name: f.name,
                value: values[f.name] ?? "",
                "aria-invalid": error ? true : undefined,
                "aria-describedby": error || f.hint ? `${id}-note` : undefined,
                className: `field ${error ? "border-madder" : ""}`,
              };
              const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }));
              return (
                <div key={f.name} className={f.span ? "sm:col-span-2" : undefined}>
                  <label htmlFor={id} className="field-label">
                    {f.label}
                    {f.optional && <span className="font-normal text-muted"> (optional)</span>}
                  </label>
                  {f.name === "main_category" ? (
                    <select {...common} onChange={onChange}>
                      <option value="">Choose…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : f.options ? (
                    <select {...common} onChange={onChange}>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.textarea ? (
                    <textarea {...common} rows={4} onChange={onChange} maxLength={2000} />
                  ) : (
                    <input {...common} type={f.type ?? "text"} placeholder={f.placeholder} autoComplete={f.autoComplete} onChange={onChange} />
                  )}
                  {(error || f.hint) && (
                    <p id={`${id}-note`} className={`mt-1 text-sm ${error ? "text-madder" : "text-muted"}`}>
                      {error || f.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {step === 2 && (
            <div className="mt-6">
              <label className="flex items-start gap-3 text-[15px]">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 h-5 w-5 accent-cobalt" />
                <span>
                  I agree to the seller terms: listings must show real, handmade products, and the information above is
                  correct.
                </span>
              </label>
              {errors.accept_terms && <p className="mt-1 text-sm text-madder">{errors.accept_terms}</p>}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary h-12 px-7">
                Back
              </button>
            )}
            <button type="submit" disabled={busy} className="btn-primary h-12 px-8">
              {step < STEPS.length - 1 ? "Continue" : busy ? "Creating your seller centre…" : "Create seller account"}
            </button>
          </div>
          <p className="mt-8 text-sm text-muted">
            Already selling with us?{" "}
            <Link href="/login?next=/firm" className="text-cobalt underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
