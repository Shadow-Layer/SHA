"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

const roles = [
  {
    value: "student",
    title: "Student",
    description: "Apply for housing and access student community features.",
  },
  {
    value: "landlord",
    title: "Landlord",
    description: "List properties and manage housing applications.",
  },
  {
    value: "service_provider",
    title: "Service Provider",
    description: "List your services and reach students and landlords directly.",
  },
] as const;

type RegisterFormProps = {
  callbackUrl: string;
  initialRole?: (typeof roles)[number]["value"];
};

export default function RegisterForm({ callbackUrl, initialRole }: RegisterFormProps) {
  const router = useRouter();

  const [role, setRole] = useState<(typeof roles)[number]["value"]>(
    initialRole ?? "student",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const submittedRole = role;
    const submittedPostRegisterUrl =
      submittedRole === "service_provider" ? "/providers/join" : callbackUrl;

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: submittedRole,
        name,
        email,
        phone,
        password,
        confirmPassword,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setIsSubmitting(false);
      setError(data.error ?? "Unable to register.");
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: submittedPostRegisterUrl,
    });

    setIsSubmitting(false);

    if (loginResult?.error) {
      setError("Account created, but auto-login failed. Please sign in.");
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(submittedPostRegisterUrl)}`);
      return;
    }

    router.push(loginResult?.url ?? submittedPostRegisterUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">I am registering as</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {roles.map((roleOption) => (
            <button
              type="button"
              key={roleOption.value}
              onClick={() => setRole(roleOption.value)}
              disabled={isSubmitting}
              className={`rounded-lg border p-4 text-left transition ${
                role === roleOption.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              } ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <p className="font-semibold">{roleOption.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {roleOption.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
