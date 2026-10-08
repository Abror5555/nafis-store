"use client";

import { useState } from "react";

import { ShieldIcon } from "@/components/icons";
import { Card } from "@/components/panel/charts";
import { shortDate } from "@/components/panel/format";
import { PageHeader } from "@/components/panel/PanelShell";
import type { FirmProfile } from "@/components/panel/types";
import { ErrorNote, Loading } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";

const EDITABLE = [
  { name: "phone", label: "Company phone", type: "tel" },
  { name: "email", label: "Company email", type: "email" },
  { name: "website", label: "Website", type: "url" },
  { name: "city", label: "City" },
  { name: "address", label: "Address" },
] as const;

export default function FirmProfilePage() {
  const { data, error, reload } = usePanelData<FirmProfile>("/api/firm/me/");
  const send = useSend();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    setMessage(null);
    try {
      await send("/api/firm/me/", "PATCH", body);
      setMessage({ ok: true, text: "Saved." });
      reload();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Changes weren't saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Company profile" description="Contact details buyers and the store team use. Legal and identity details are locked after registration." />
      <ErrorNote message={error} />
      {!data ? (
        <Loading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title="Contact details">
            <form onSubmit={save} className="space-y-4" key={data.id}>
              {EDITABLE.map((f) => (
                <div key={f.name}>
                  <label htmlFor={`fp-${f.name}`} className="field-label">
                    {f.label}
                  </label>
                  <input
                    id={`fp-${f.name}`}
                    name={f.name}
                    type={"type" in f ? f.type : "text"}
                    defaultValue={data[f.name]}
                    className="field"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="fp-description" className="field-label">
                  About the workshop
                </label>
                <textarea id="fp-description" name="description" rows={5} defaultValue={data.description} className="field" />
              </div>
              <div className="flex items-center gap-4">
                <button type="submit" disabled={saving} className="btn-primary h-11 px-6">
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {message && (
                  <p role="status" className={`text-sm ${message.ok ? "text-ishqor-text" : "text-madder"}`}>
                    {message.text}
                  </p>
                )}
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card title="Company">
              <dl className="divide-y divide-line text-[14px]">
                {[
                  ["Name", data.name],
                  ["Legal form", data.legal_form_display],
                  ["Tax ID (STIR)", data.tax_id],
                  ["Main craft", data.main_category_name || "Not set"],
                  ["Seller since", shortDate(data.created_at)],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Owner">
              <dl className="divide-y divide-line text-[14px]">
                {[
                  ["Full name", data.owner_full_name],
                  ["Phone", data.owner_phone],
                  ["Sign-in email", data.owner_email],
                  ["Passport", data.passport_masked],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className={k === "Passport" ? "font-mono tracking-wider" : ""}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex gap-2 text-[13px] text-muted">
                <ShieldIcon width={16} height={16} className="mt-0.5 shrink-0" />
                {data.is_verified ? `Verified on ${shortDate(data.verified_at)}.` : "Verification in progress."} To change owner
                details, write to the store team.
              </p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
