"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type PreferredContact = "whatsapp" | "call" | "email";
type ServiceCategory =
  | "transport"
  | "wifi_internet"
  | "moving"
  | "cleaning"
  | "repairs_handyman"
  | "food_catering"
  | "security"
  | "other";
type Availability = "always" | "weekdays" | "weekends" | "on_request";
type TargetCustomers = "students" | "landlords" | "both";

type FormState = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContact: PreferredContact;
  category: ServiceCategory;
  description: string;
  areasServed: string;
  availability: Availability;
  priceRange: string;
  pricingNotes: string;
  photos: string[];
  targetCustomers: TargetCustomers;
  consentGiven: boolean;
};

const INITIAL_FORM: FormState = {
  businessName: "",
  contactName: "",
  phone: "",
  email: "",
  preferredContact: "whatsapp",
  category: "transport",
  description: "",
  areasServed: "",
  availability: "always",
  priceRange: "",
  pricingNotes: "",
  photos: [],
  targetCustomers: "students",
  consentGiven: false,
};

const fieldClassName =
  "mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring";

const CATEGORY_OPTIONS: Array<{ value: ServiceCategory; label: string }> = [
  { value: "transport", label: "Transport" },
  { value: "wifi_internet", label: "WiFi / Internet" },
  { value: "moving", label: "Moving" },
  { value: "cleaning", label: "Cleaning" },
  { value: "repairs_handyman", label: "Repairs / Handyman" },
  { value: "food_catering", label: "Food / Catering" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const CONTACT_OPTIONS: Array<{ value: PreferredContact; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call", label: "Phone Call" },
  { value: "email", label: "Email" },
];

const AVAILABILITY_OPTIONS: Array<{ value: Availability; label: string }> = [
  { value: "always", label: "Always available" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekends", label: "Weekends only" },
  { value: "on_request", label: "On request" },
];

const TARGET_OPTIONS: Array<{ value: TargetCustomers; label: string }> = [
  { value: "students", label: "Students" },
  { value: "landlords", label: "Landlords" },
  { value: "both", label: "Both" },
];

function RadioGroup<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (nextValue: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
              value === option.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ServiceProviderRegisterForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Upload failed");
        }

        newUrls.push(data.url);
      }

      setForm((current) => ({ ...current, photos: [...current.photos, ...newUrls] }));
      event.target.value = "";
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/service-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit your service.");
      }

      setForm(INITIAL_FORM);
      setUploadError(null);
      setSuccess(data.message || "Your service has been submitted for review. We'll be in touch.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your service.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
        Public listing request
      </div>
      <h1 className="mt-4 text-2xl font-semibold">List Your Service on SHA</h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Reach students and landlords directly. Fill in your service details below and we&apos;ll
        review the submission before it goes live.
      </p>

      <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            1. Provider Details
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="businessName">
                Business / Service Name *
              </label>
              <input
                id="businessName"
                className={fieldClassName}
                value={form.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                placeholder="Mutare Fast Movers"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="contactName">
                Contact Person
              </label>
              <input
                id="contactName"
                className={fieldClassName}
                value={form.contactName}
                onChange={(event) => updateField("contactName", event.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="phone">
                Phone Number *
              </label>
              <input
                id="phone"
                type="tel"
                className={fieldClassName}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+263 7XX XXX XXX"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={fieldClassName}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <RadioGroup
            label="Preferred Contact Method"
            name="preferredContact"
            value={form.preferredContact}
            options={CONTACT_OPTIONS}
            onChange={(nextValue) => updateField("preferredContact", nextValue)}
          />
        </section>

        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Service Information
          </h2>
          <div>
            <label className="text-sm font-medium" htmlFor="category">
              Service Category *
            </label>
            <select
              id="category"
              className={fieldClassName}
              value={form.category}
              onChange={(event) => updateField("category", event.target.value as ServiceCategory)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="description">
              Service Description
            </label>
            <textarea
              id="description"
              className={`${fieldClassName} min-h-28 resize-y`}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Describe what you do in simple terms."
            />
          </div>
        </section>

        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3. Coverage &amp; Availability
          </h2>
          <div>
            <label className="text-sm font-medium" htmlFor="areasServed">
              Areas Served
            </label>
            <input
              id="areasServed"
              className={fieldClassName}
              value={form.areasServed}
              onChange={(event) => updateField("areasServed", event.target.value)}
              placeholder="Greenside, Chikanga, CBD"
            />
          </div>
          <RadioGroup
            label="Availability"
            name="availability"
            value={form.availability}
            options={AVAILABILITY_OPTIONS}
            onChange={(nextValue) => updateField("availability", nextValue)}
          />
        </section>

        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            4. Pricing
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="priceRange">
                Price Range / Starting Price
              </label>
              <input
                id="priceRange"
                className={fieldClassName}
                value={form.priceRange}
                onChange={(event) => updateField("priceRange", event.target.value)}
                placeholder="$5-$20 or From $10"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="pricingNotes">
                Pricing Notes
              </label>
              <input
                id="pricingNotes"
                className={fieldClassName}
                value={form.pricingNotes}
                onChange={(event) => updateField("pricingNotes", event.target.value)}
                placeholder="Distance-based pricing"
              />
            </div>
          </div>
        </section>

        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            5. Photos
          </h2>
          <div className="rounded-xl border border-dashed bg-muted/30 p-5">
            <label className="text-sm font-medium" htmlFor="photos">
              Upload photos of your work, equipment, or recent jobs
            </label>
            <input
              id="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className={`${fieldClassName} cursor-pointer`}
              onChange={(event) => void handleFileChange(event)}
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{form.photos.length} uploaded</span>
              {uploading ? <span>Uploading...</span> : null}
            </div>
            {uploadError ? <p className="mt-3 text-sm text-red-600">{uploadError}</p> : null}
          </div>
        </section>

        <section className="space-y-5 border-b pb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            6. Target Audience
          </h2>
          <RadioGroup
            label="Who do you serve?"
            name="targetCustomers"
            value={form.targetCustomers}
            options={TARGET_OPTIONS}
            onChange={(nextValue) => updateField("targetCustomers", nextValue)}
          />
        </section>

        <section className="space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            7. Terms &amp; Consent
          </h2>
          <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border"
              checked={form.consentGiven}
              onChange={(event) => updateField("consentGiven", event.target.checked)}
            />
            <span>
              I confirm that the information provided is accurate and I agree to have my service
              listed on SHA. I understand that users will contact me directly.
            </span>
          </label>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Submission takes about 2-3 minutes.</p>
          <Button type="submit" size="lg" disabled={submitting || !form.consentGiven || uploading}>
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </form>
    </section>
  );
}
