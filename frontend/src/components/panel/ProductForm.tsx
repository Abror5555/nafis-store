"use client";

import { useEffect, useRef, useState } from "react";

import { ImageIcon } from "@/components/icons";
import ProductArt from "@/components/ProductArt";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/lib/types";

import type { ManagedProduct } from "./types";
import { useSend } from "./usePanelData";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Errors = Record<string, string>;

/**
 * Create or edit a product: photo with live preview, all catalog fields, and a
 * preview card that shows exactly how the product will look in the shop.
 */
export default function ProductForm({
  endpoint,
  initial,
  submitLabel,
  defaultOrigin = "",
  onSaved,
}: {
  endpoint: string;
  initial?: ManagedProduct;
  submitLabel: string;
  defaultOrigin?: string;
  onSaved: (product: ManagedProduct) => void;
}) {
  const send = useSend();
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    category: initial ? String(initial.category) : "",
    summary: initial?.summary ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    stock: initial ? String(initial.stock) : "1",
    origin: initial?.origin ?? defaultOrigin,
    materials: initial?.materials ?? "",
    dimensions: initial?.dimensions ?? "",
    is_active: initial?.is_active ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories/")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview follows the chosen file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function choose(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, image: "Use a JPEG, PNG, WebP or GIF image." }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, image: "The photo is larger than 5 MB. Export a smaller version." }));
      return;
    }
    setErrors((current) => {
      const next = { ...current };
      delete next.image;
      return next;
    });
    setImage(file);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!values.name.trim()) e.name = "Give the product a name.";
    if (!values.category) e.category = "Choose a craft.";
    if (!values.summary.trim()) e.summary = "Write one line for the product card.";
    if (!values.description.trim()) e.description = "Describe the product.";
    if (!(Number(values.price) > 0)) e.price = "Enter a price above zero.";
    if (!(Number.isInteger(Number(values.stock)) && Number(values.stock) >= 0)) e.stock = "Stock is a whole number, 0 or more.";
    if (!values.origin.trim()) e.origin = "Where is it made?";
    return e;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      setFormError("Some fields need attention.");
      return;
    }
    const body = new FormData();
    Object.entries(values).forEach(([k, v]) => body.append(k, String(v)));
    if (image) body.append("image", image);
    setBusy(true);
    try {
      const saved = await send<ManagedProduct>(endpoint, initial ? "PATCH" : "POST", body);
      onSaved(saved);
      if (!initial) {
        setValues((v) => ({ ...v, name: "", summary: "", description: "", price: "", stock: "1", materials: "", dimensions: "" }));
        setImage(null);
        setPreview(null);
      }
    } catch (e) {
      const fields = (e as { fields?: Record<string, string[] | string> }).fields ?? {};
      const mapped: Errors = {};
      Object.entries(fields).forEach(([k, v]) => (mapped[k] = Array.isArray(v) ? v.join(" ") : String(v)));
      setErrors(mapped);
      setFormError(e instanceof Error ? e.message : "The product wasn't saved.");
    } finally {
      setBusy(false);
    }
  }

  const categorySlug = categories.find((c) => String(c.id) === values.category)?.slug ?? "textiles";
  const field = (name: keyof typeof values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`pf-${name}`} className="field-label">
        {label}
      </label>
      <input
        id={`pf-${name}`}
        value={String(values[name])}
        onChange={set(name)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `pf-${name}-error` : undefined}
        className={`field ${errors[name] ? "border-madder" : ""}`}
        {...props}
      />
      {errors[name] && (
        <p id={`pf-${name}-error`} className="mt-1 text-sm text-madder">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        {formError && (
          <p role="alert" className="rounded-lg border border-madder/40 bg-madder/5 px-4 py-3 text-[15px] text-madder">
            {formError}
          </p>
        )}

        <div>
          <p className="field-label">Photo</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragging ? "border-cobalt bg-tint" : "border-line bg-surface"
            }`}
          >
            <ImageIcon width={32} height={32} className="text-muted" />
            <p className="text-[15px]">
              Drag a photo here, or{" "}
              <button type="button" onClick={() => fileInput.current?.click()} className="text-cobalt underline underline-offset-4">
                choose a file
              </button>
            </p>
            <p className="text-[13px] text-muted">Square photos look best. JPEG, PNG or WebP, up to 5 MB.</p>
            {image && <p className="text-[13px]">Selected: {image.name}</p>}
            <input
              ref={fileInput}
              type="file"
              accept={TYPES.join(",")}
              className="sr-only"
              aria-label="Product photo"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </div>
          {errors.image && <p className="mt-1 text-sm text-madder">{errors.image}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("name", "Product name", { maxLength: 140, placeholder: "Rishtan lagan plate, 32 cm" })}</div>
          <div>
            <label htmlFor="pf-category" className="field-label">
              Craft
            </label>
            <select
              id="pf-category"
              value={values.category}
              onChange={set("category")}
              aria-invalid={errors.category ? true : undefined}
              className={`field ${errors.category ? "border-madder" : ""}`}
            >
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-madder">{errors.category}</p>}
          </div>
          {field("origin", "Made in", { placeholder: "Rishtan, Fergana Valley", maxLength: 120 })}
          {field("price", "Price, USD", { inputMode: "decimal", placeholder: "48.00" })}
          {field("stock", "In stock", { inputMode: "numeric" })}
          {field("materials", "Materials (optional)", { placeholder: "Red clay, ishqor glaze", maxLength: 160 })}
          {field("dimensions", "Size (optional)", { placeholder: "Ø 32 cm", maxLength: 120 })}
          <div className="sm:col-span-2">
            <label htmlFor="pf-summary" className="field-label">
              One-line summary
            </label>
            <input
              id="pf-summary"
              value={values.summary}
              onChange={set("summary")}
              maxLength={200}
              aria-invalid={errors.summary ? true : undefined}
              className={`field ${errors.summary ? "border-madder" : ""}`}
              placeholder="Large serving plate with a pomegranate rosette."
            />
            <p className="mt-1 flex justify-between text-[13px] text-muted">
              <span className="text-madder">{errors.summary}</span>
              <span>{values.summary.length}/200</span>
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pf-description" className="field-label">
              Description
            </label>
            <textarea
              id="pf-description"
              rows={6}
              value={values.description}
              onChange={set("description")}
              aria-invalid={errors.description ? true : undefined}
              className={`field ${errors.description ? "border-madder" : ""}`}
              placeholder="How it's made, what it's used for, how to care for it. Leave an empty line between paragraphs."
            />
            {errors.description && <p className="mt-1 text-sm text-madder">{errors.description}</p>}
          </div>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
              className="h-5 w-5 accent-cobalt"
            />
            <span className="text-[15px]">Show in the store as soon as it&apos;s saved</span>
          </label>
        </div>

        <button type="submit" disabled={busy} className="btn-primary h-12 px-8">
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <p className="mb-3 text-sm text-muted">How it will look in the shop</p>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="relative aspect-square overflow-hidden rounded-md bg-tint">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
              <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <ProductArt seed={values.name || "new"} category={categorySlug} className="absolute inset-0 h-full w-full" />
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="text-[15px] font-medium leading-snug">{values.name || "Product name"}</p>
            <p className="shrink-0 tabular-nums">{Number(values.price) > 0 ? formatPrice(values.price) : "$0"}</p>
          </div>
          <p className="mt-1 text-sm text-muted">{values.origin || "Made in"}</p>
          {Number(values.stock) === 0 && <p className="mt-1 text-sm text-madder">Sold out</p>}
          {!values.is_active && <p className="mt-3 rounded bg-tint px-2 py-1 text-[13px]">Hidden from the store</p>}
        </div>
      </aside>
    </form>
  );
}
