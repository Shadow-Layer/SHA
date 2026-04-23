"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ProviderClaimFormProps = {
  token: string;
  businessName: string;
  initialPhone: string;
  initialEmail: string;
};

export default function ProviderClaimForm({
  token,
  businessName,
  initialPhone,
  initialEmail,
}: ProviderClaimFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Phone is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the terms to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const claimResponse = await fetch("/api/invites/claim/provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          phone,
          password,
          termsAccepted,
        }),
      });

      const claimData = (await claimResponse.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
      };

      if (!claimResponse.ok || !claimData.ok || !claimData.email) {
        setError(claimData.error ?? "Unable to claim this account.");
        setIsSubmitting(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: claimData.email,
        password,
        redirect: false,
      });

      if (signInResult?.error || !signInResult?.ok) {
        setError("Account created, but sign-in failed. Please sign in manually.");
        setIsSubmitting(false);
        return;
      }

      router.push("/providers/join");
      router.refresh();
    } catch {
      setError("Unable to claim this account. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Provider Invitation
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{businessName}</h1>
        <p className="mt-2 text-sm text-emerald-900">
          Confirm your contact details, create a password, and we&apos;ll take you to your provider
          setup page.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="provider-phone" className="text-sm font-medium">
              Phone
            </label>
            <input
              id="provider-phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="provider-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="provider-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="provider-password"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
        </div>

        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            I confirm these details are correct and I agree to SHA&apos;s terms for creating a
            provider account.
          </span>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Claiming account..." : "Claim account"}
        </Button>
      </form>
    </section>
  );
}
