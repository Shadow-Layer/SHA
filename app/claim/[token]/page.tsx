"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type InviteValidationSuccess = {
  valid: true;
  landlordName: string;
  landlordPhone: string;
  listingTitle: string;
  listingArea: string;
};

type InviteValidationFailure = {
  valid: false;
  reason: "invalid" | "expired";
};

type InviteValidationResponse = InviteValidationSuccess | InviteValidationFailure;

export default function ClaimInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [isLoading, setIsLoading] = useState(true);
  const [invite, setInvite] = useState<InviteValidationResponse | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invalidInviteMessage =
    "This invite link is invalid or has expired. Please contact the SHA team to request a new link.";

  useEffect(() => {
    let isActive = true;

    async function validateInvite() {
      if (!token) {
        if (isActive) {
          setInvite({ valid: false, reason: "invalid" });
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/invites/validate?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as InviteValidationResponse;

        if (!isActive) {
          return;
        }

        setInvite(data);

        if (data.valid) {
          setPhone(data.landlordPhone);
        }
      } catch {
        if (isActive) {
          setInvite({ valid: false, reason: "invalid" });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void validateInvite();

    return () => {
      isActive = false;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms of Use to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const claimResponse = await fetch("/api/invites/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          phone,
          password,
          confirmPassword,
          termsAccepted,
        }),
      });

      const claimData = (await claimResponse.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
      };

      if (!claimResponse.ok || !claimData.ok || !claimData.email) {
        setError(claimData.error ?? "Unable to activate your account.");
        setIsSubmitting(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: claimData.email,
        password,
        redirect: false,
      });

      if (signInResult?.error || !signInResult?.ok) {
        setError("Account activated, but sign-in failed. Please sign in manually.");
        setIsSubmitting(false);
        return;
      }

      router.push("/onboarding/landlord");
      router.refresh();
    } catch {
      setError("Unable to activate your account. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Checking your invite</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re validating your claim link.
              </p>
            </div>
          </div>
        ) : invite?.valid === false ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Invite unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">{invalidInviteMessage}</p>
          </div>
        ) : invite?.valid ? (
          <div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-950">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                Property preview
              </p>
              <p className="mt-2 text-lg font-semibold">{invite.listingTitle}</p>
              <p className="text-sm text-green-800">{invite.listingArea}</p>
            </div>

            <div className="mt-6 flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-2.5 flex-1 rounded-full ${
                    index === 0 ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-semibold tracking-tight">Set up your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ve been invited to list your property on Student Housing
                Archive. Create a password to continue.
              </p>
              {invite.landlordName ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Claiming as{" "}
                  <span className="font-medium text-foreground">
                    {invite.landlordName}
                  </span>
                </p>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">SHA Terms of Use</p>
                <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                  By creating an account you agree to SHA&apos;s Terms of Use. Your
                  property details will be displayed to students. You may update or
                  remove your listing at any time from your dashboard. SHA connects
                  students directly to landlords without agent fees.
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span>
                  I accept the Terms of Use and consent to my property being listed on
                  SHA
                </span>
              </label>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Activating account..." : "Activate Account & Continue →"}
              </Button>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
