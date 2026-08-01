"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type FormState = {
  title: string;
  area: string;
  landmark: string;
  contactHint: string;
  notes: string;
  submitterEmail: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  area: "",
  landmark: "",
  contactHint: "",
  notes: "",
  submitterEmail: "",
};

const fieldClassName =
  "mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring";

export default function SubmitLeadPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit lead");
      }

      setForm(INITIAL_FORM);
      setSuccess("Thanks. Your anonymous housing lead has been submitted.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit lead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
          ✓ Anonymous — no sign-up required
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Share a Housing Lead</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Know a place students should hear about? Share the basic details below.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="title">
                Title *
              </label>
              <input
                id="title"
                className={fieldClassName}
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Room in Braamfontein"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="area">
                Area *
              </label>
              <input
                id="area"
                className={fieldClassName}
                value={form.area}
                onChange={(event) => updateField("area", event.target.value)}
                placeholder="Braamfontein"
                required
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="landmark">
                Landmark
              </label>
              <input
                id="landmark"
                className={fieldClassName}
                value={form.landmark}
                onChange={(event) => updateField("landmark", event.target.value)}
                placeholder="Near Wits East Campus"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="contactHint">
                Contact Hint
              </label>
              <input
                id="contactHint"
                className={fieldClassName}
                value={form.contactHint}
                onChange={(event) => updateField("contactHint", event.target.value)}
                placeholder="Ask at front desk / WhatsApp only"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className={`${fieldClassName} min-h-28 resize-y`}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Anything students should know about the place."
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="submitterEmail">
              Submitter Email
            </label>
            <input
              id="submitterEmail"
              type="email"
              className={fieldClassName}
              value={form.submitterEmail}
              onChange={(event) => updateField("submitterEmail", event.target.value)}
              placeholder="name@example.com"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Add this only if you want admins to contact you for clarification.
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">🔒 Your submission is anonymous</p>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Lead"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
