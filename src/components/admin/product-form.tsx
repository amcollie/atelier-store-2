"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

import { type AdminActionState, IDLE } from "@/lib/admin/action-types";
import {
  createProductSchema,
  PRODUCT_LIMITS,
  parseSizeLabels,
  parseWith,
  productFormInput,
  slugify,
  updateProductSchema,
} from "@/lib/admin/schemas";
import { ALLOWED_IMAGE_HOSTS } from "@/lib/image-hosts";

// Create and edit form for one product. It runs the shared zod schema before
// submitting for instant feedback; the server action parses again and is the
// one that decides. Field order follows the order an admin fills them in.

export type ProductFormValues = {
  id?: number;
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  badge: string;
  styleCode: string;
  color: string;
  description: string;
  details: string;
  care: string;
  imageUrl: string;
  imageAlt: string;
  gallery: string;
  sizes: string;
  unavailableSizes: string[];
  quantity: string;
};

type CategoryOption = { id: number; name: string; children: { id: number; name: string }[] };

type Props = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initial: ProductFormValues;
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
};

export function ProductForm({ mode, categories, initial, action }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [sizeText, setSizeText] = useState(initial.sizes);
  const [unavailable, setUnavailable] = useState(() => new Set(initial.unavailableSizes));

  // Client errors from the last attempt, else the server's (cleared on each submit).
  const errors = clientErrors ?? state.fieldErrors ?? {};
  const sizeLabels = parseSizeLabels(sizeText);

  // Move focus to the first invalid field after the server answers.
  useEffect(() => {
    if (state.status !== "error" || pending) return;
    if (!focusFirstError(formRef.current, state.fieldErrors)) bannerRef.current?.focus();
  }, [state, pending]);

  // Submits through the action in a transition instead of <form action>: React
  // resets a form after its action finishes, which would wipe what the admin
  // typed whenever the server rejects a field.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    const schema = mode === "create" ? createProductSchema : updateProductSchema;
    const parsed = parseWith(schema, productFormInput(formData));
    if (!parsed.ok) {
      setClientErrors(parsed.fieldErrors);
      focusFirstError(event.currentTarget, parsed.fieldErrors);
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  const field = (key: string) => {
    const error = errors[key];
    return {
      id: `${id}-${key}`,
      name: key,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": [`${id}-${key}-hint`, error && `${id}-${key}-error`].filter(Boolean).join(" ") || undefined,
    } as const;
  };

  const showBanner = !pending && (state.status !== "idle" || clientErrors);
  const bannerText = clientErrors ? "Check the highlighted fields." : state.message;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="stack gap-10">
      {mode === "edit" ? <input type="hidden" name="id" value={initial.id} /> : null}

      {showBanner && bannerText ? (
        <p
          ref={bannerRef}
          tabIndex={-1}
          role={state.status === "ok" && !clientErrors ? "status" : "alert"}
          className={`border-l-2 py-1 pl-4 text-meta outline-none ${
            state.status === "ok" && !clientErrors ? "border-success text-success" : "border-danger text-danger"
          }`}
        >
          {bannerText}
        </p>
      ) : null}

      <Section title="Basics">
        <Field label="Name" fieldId={`${id}-name`} error={errors.name} hintId={`${id}-name-hint`}>
          <input
            {...field("name")}
            className="field"
            value={name}
            maxLength={PRODUCT_LIMITS.name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        {mode === "create" ? (
          <Field
            label="URL slug"
            fieldId={`${id}-slug`}
            error={errors.slug}
            hintId={`${id}-slug-hint`}
            hint={`The store address: /products/${slug || "your-product"}. It can't be changed later.`}
          >
            <input
              {...field("slug")}
              className="field"
              value={slug}
              maxLength={PRODUCT_LIMITS.slug}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
            />
          </Field>
        ) : (
          <div className="stack gap-1">
            <p className="eyebrow">URL slug</p>
            <p className="text-meta break-all">/products/{initial.slug}</p>
            <p className="text-meta text-muted">Fixed after creation so store links and past orders keep working.</p>
          </div>
        )}

        <Field label="Sub-category" fieldId={`${id}-categoryId`} error={errors.categoryId} hintId={`${id}-categoryId-hint`}>
          <select {...field("categoryId")} className="field" defaultValue={initial.categoryId}>
            <option value="">Choose a sub-category</option>
            {categories.map((top) => (
              <optgroup key={top.id} label={top.name}>
                {top.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {top.name} / {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label="Price (USD)"
            fieldId={`${id}-price`}
            error={errors.price}
            hintId={`${id}-price-hint`}
            hint="In dollars, like 480 or 1,320.00."
          >
            <input {...field("price")} className="field tabular-nums" inputMode="decimal" defaultValue={initial.price} />
          </Field>
          <Field label="Badge" fieldId={`${id}-badge`} error={errors.badge} hintId={`${id}-badge-hint`} hint="Optional, like New or Limited.">
            <input {...field("badge")} className="field" maxLength={PRODUCT_LIMITS.badge} defaultValue={initial.badge} />
          </Field>
          <Field label="Style code" fieldId={`${id}-styleCode`} error={errors.styleCode} hintId={`${id}-styleCode-hint`}>
            <input
              {...field("styleCode")}
              className="field"
              maxLength={PRODUCT_LIMITS.styleCode}
              spellCheck={false}
              defaultValue={initial.styleCode}
            />
          </Field>
          <Field label="Colour" fieldId={`${id}-color`} error={errors.color} hintId={`${id}-color-hint`}>
            <input {...field("color")} className="field" maxLength={PRODUCT_LIMITS.color} defaultValue={initial.color} />
          </Field>
        </div>
      </Section>

      <Section title="Description">
        <Field label="Description" fieldId={`${id}-description`} error={errors.description} hintId={`${id}-description-hint`}>
          <textarea {...field("description")} className="field py-2" rows={4} defaultValue={initial.description} />
        </Field>
        <Field
          label="Product details"
          fieldId={`${id}-details`}
          error={errors.details}
          hintId={`${id}-details-hint`}
          hint={`One per line, up to ${PRODUCT_LIMITS.detailLines}.`}
        >
          <textarea {...field("details")} className="field py-2" rows={5} defaultValue={initial.details} />
        </Field>
        <Field label="Care" fieldId={`${id}-care`} error={errors.care} hintId={`${id}-care-hint`}>
          <textarea {...field("care")} className="field py-2" rows={3} defaultValue={initial.care} />
        </Field>
      </Section>

      <Section title="Images" note={`Paste https image URLs from ${ALLOWED_IMAGE_HOSTS}.`}>
        <Field label="Main image URL" fieldId={`${id}-imageUrl`} error={errors.imageUrl} hintId={`${id}-imageUrl-hint`}>
          <input {...field("imageUrl")} className="field" type="url" spellCheck={false} defaultValue={initial.imageUrl} />
        </Field>
        <Field
          label="Main image description"
          fieldId={`${id}-imageAlt`}
          error={errors.imageAlt}
          hintId={`${id}-imageAlt-hint`}
          hint="What the photo shows, for screen readers."
        >
          <input {...field("imageAlt")} className="field" maxLength={PRODUCT_LIMITS.alt} defaultValue={initial.imageAlt} />
        </Field>
        <Field
          label="More images"
          fieldId={`${id}-gallery`}
          error={errors.gallery}
          hintId={`${id}-gallery-hint`}
          hint={`Optional. One per line as "URL | description", up to ${PRODUCT_LIMITS.galleryImages}.`}
        >
          <textarea {...field("gallery")} className="field py-2" rows={4} spellCheck={false} defaultValue={initial.gallery} />
        </Field>
      </Section>

      <Section title="Availability">
        <Field
          label="Sizes"
          fieldId={`${id}-sizes`}
          error={errors.sizes}
          hintId={`${id}-sizes-hint`}
          hint="Comma-separated, like XS, S, M, L. Leave empty for a one-size product."
        >
          <input {...field("sizes")} className="field" value={sizeText} onChange={(e) => setSizeText(e.target.value)} />
        </Field>
        {sizeLabels.length > 0 ? (
          <fieldset className="stack gap-3">
            <legend className="eyebrow mb-3">Sizes on sale</legend>
            <div className="cluster gap-x-6 gap-y-3">
              {sizeLabels.map((label) => (
                <label key={label} className="flex items-center gap-2 text-meta">
                  <input
                    type="checkbox"
                    name="sizeAvailable"
                    value={label}
                    checked={!unavailable.has(label)}
                    onChange={(e) =>
                      setUnavailable((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(label);
                        else next.add(label);
                        return next;
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-meta text-muted">Untick a size to show it as unavailable. Stock is shared by all sizes.</p>
          </fieldset>
        ) : null}

        {mode === "create" ? (
          <Field
            label="Available quantity"
            fieldId={`${id}-quantity`}
            error={errors.quantity}
            hintId={`${id}-quantity-hint`}
            hint="Units ready to sell. 0 shows the product as sold out."
          >
            <input
              {...field("quantity")}
              className="field tabular-nums"
              inputMode="numeric"
              defaultValue={initial.quantity}
            />
          </Field>
        ) : null}
      </Section>

      <div className="cluster gap-4">
        <button type="submit" className="btn btn-primary" aria-disabled={pending || undefined}>
          {pending ? (
            <span
              aria-hidden="true"
              className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : null}
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {pending ? "Saving product" : ""}
        </p>
      </div>
    </form>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="stack min-w-0 gap-6 border-t border-line pt-6">
      <legend className="sr-only">{title}</legend>
      <div className="stack gap-1">
        <h2 className="eyebrow" aria-hidden="true">
          {title}
        </h2>
        {note ? <p className="text-meta text-muted">{note}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  fieldId,
  hint,
  hintId,
  error,
  children,
}: {
  label: string;
  fieldId: string;
  hint?: string;
  hintId: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="stack min-w-0 gap-1">
      <label htmlFor={fieldId} className="eyebrow">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="text-meta text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function focusFirstError(form: HTMLFormElement | null, fieldErrors?: Record<string, string>): boolean {
  if (!form || !fieldErrors) return false;
  for (const el of Array.from(form.elements)) {
    const name = (el as HTMLInputElement).name;
    if (name && fieldErrors[name] && "focus" in el) {
      (el as HTMLElement).focus();
      return true;
    }
  }
  return false;
}
