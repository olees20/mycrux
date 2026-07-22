"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createFirstGymAction } from "@/features/gyms/actions";
import { initialFirstGymActionState, type FirstGymFormValues } from "@/features/gyms/state";

type Availability = "idle" | "checking" | "available" | "unavailable" | "error";

function slugFromName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
}

export function FirstGymForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(createFirstGymAction, initialFirstGymActionState);
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(state.values?.slug));
  const [availability, setAvailability] = useState<Availability>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const summary = useRef<HTMLDivElement>(null);
  const summaryId = useId();

  useEffect(() => {
    if (state.status === "error") summary.current?.focus();
  }, [state.status, state.message]);

  useEffect(() => {
    if (slug.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability("checking");
      setAvailabilityMessage("Checking availability…");
      try {
        const response = await fetch(`/api/onboarding/gym-slug?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json() as { available?: boolean; error?: string; message?: string; valid?: boolean };
        if (!response.ok) throw new Error(result.error ?? "Availability could not be checked");
        if (result.valid === false || !result.available) {
          setAvailability("unavailable");
          setAvailabilityMessage(result.message ?? "That gym address is already in use.");
          return;
        }
        setAvailability("available");
        setAvailabilityMessage("Gym address is available.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailability("error");
        setAvailabilityMessage("Availability could not be checked. You can still submit; creation checks it again securely.");
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const slugInvalid = availability === "unavailable" || Boolean(errors.slug);
  const displayedAvailabilityMessage = slug.length > 0 && slug.length < 3
    ? "Use at least 3 characters."
    : availabilityMessage || "Lowercase letters, numbers, and single hyphens.";

  function updateSlug(value: string) {
    setSlug(value);
    setAvailability("idle");
    setAvailabilityMessage("");
  }

  return (
    <form action={action} aria-describedby={state.message ? summaryId : undefined} className="space-y-7">
      {state.message ? (
        <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-4 outline-none" id={summaryId} ref={summary} role="alert" tabIndex={-1}>
          <p className="font-bold text-red-900">The gym was not created</p>
          <p className="mt-1 text-sm text-red-800">{state.message}</p>
        </div>
      ) : null}

      <fieldset className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 md:grid-cols-2">
        <legend className="px-2 text-xl font-black">Organisation</legend>
        <Field error={errors.name} label="Gym name" name="name" required>
          <input
            {...validationProps("name", errors.name)}
            autoComplete="organization"
            className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal"
            maxLength={120}
            name="name"
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) updateSlug(slugFromName(nextName));
            }}
            required
            value={name}
          />
        </Field>
        <Field error={errors.slug} label="Gym URL" name="slug" required>
          <div className="mt-2 flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-[var(--focus-ring)]">
            <span aria-hidden="true" className="pl-4 text-sm text-[var(--muted)]">/g/</span>
            <input
              aria-describedby={`slug-availability${errors.slug ? " slug-error" : ""}`}
              aria-invalid={slugInvalid}
              className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-md)] px-1 pr-4 font-normal outline-none"
              maxLength={63}
              minLength={3}
              name="slug"
              onChange={(event) => {
                setSlugEdited(true);
                updateSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              value={slug}
            />
          </div>
          <p aria-live="polite" className={`mt-2 text-sm ${availability === "available" ? "text-green-800" : availability === "unavailable" ? "text-red-700" : "text-[var(--muted)]"}`} id="slug-availability">
            {displayedAvailabilityMessage}
          </p>
        </Field>
        <Field error={errors.contactEmail} label="Contact email (optional)" name="contactEmail">
          <input {...validationProps("contactEmail", errors.contactEmail)} autoComplete="email" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.contactEmail ?? defaultEmail} maxLength={320} name="contactEmail" type="email" />
        </Field>
        <Field error={errors.contactPhone} label="Phone (optional)" name="contactPhone">
          <input {...validationProps("contactPhone", errors.contactPhone)} autoComplete="tel" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.contactPhone} maxLength={40} name="contactPhone" type="tel" />
        </Field>
        <Field className="md:col-span-2" error={errors.websiteUrl} label="Website (optional)" name="websiteUrl">
          <input {...validationProps("websiteUrl", errors.websiteUrl)} autoComplete="url" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.websiteUrl} maxLength={2048} name="websiteUrl" placeholder="https://example.com" type="url" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 md:grid-cols-2">
        <legend className="px-2 text-xl font-black">Address <span className="text-sm font-normal text-[var(--muted)]">(optional)</span></legend>
        <Field className="md:col-span-2" error={errors.addressLine1} label="Address line 1" name="addressLine1">
          <input {...validationProps("addressLine1", errors.addressLine1)} autoComplete="address-line1" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.addressLine1} maxLength={160} name="addressLine1" />
        </Field>
        <Field className="md:col-span-2" error={errors.addressLine2} label="Address line 2" name="addressLine2">
          <input {...validationProps("addressLine2", errors.addressLine2)} autoComplete="address-line2" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.addressLine2} maxLength={160} name="addressLine2" />
        </Field>
        <Field error={errors.city} label="Town or city" name="city">
          <input {...validationProps("city", errors.city)} autoComplete="address-level2" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.city} maxLength={100} name="city" />
        </Field>
        <Field error={errors.postcode} label="Postcode" name="postcode">
          <input {...validationProps("postcode", errors.postcode)} autoComplete="postal-code" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal" defaultValue={values?.postcode} maxLength={20} name="postcode" />
        </Field>
        <Field error={errors.countryCode} label="Country code" name="countryCode">
          <input {...validationProps("countryCode", errors.countryCode)} autoCapitalize="characters" autoComplete="country" className="mt-2 min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 font-normal uppercase" defaultValue={values?.countryCode ?? "GB"} maxLength={2} minLength={2} name="countryCode" pattern="[A-Za-z]{2}" />
        </Field>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="min-h-12 px-7" disabled={pending || availability === "checking" || availability === "unavailable"} type="submit">
          {pending ? "Creating your gym…" : "Create gym"}
        </Button>
        <p className="text-sm leading-6 text-[var(--muted)]">You will become the gym owner and can publish the member QR and assign team roles next.</p>
      </div>
    </form>
  );
}

function validationProps(name: keyof FirstGymFormValues, error?: string) {
  return {
    "aria-describedby": error ? `${name}-error` : undefined,
    "aria-invalid": error ? true : undefined,
  } as const;
}

function Field({
  children,
  className = "",
  error,
  label,
  name,
  required = false,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
  name: keyof FirstGymFormValues;
  required?: boolean;
}>) {
  const errorId = `${name}-error`;
  return (
    <label className={`block text-sm font-semibold ${className}`}>
      {label}{required ? <span aria-hidden="true"> *</span> : null}
      {children}
      {error ? <span className="mt-2 block text-sm text-red-700" id={errorId}>{error}</span> : null}
    </label>
  );
}
