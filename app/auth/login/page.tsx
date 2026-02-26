import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: {
    callbackUrl?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = searchParams.callbackUrl ?? "/dashboard";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your Student Housing Archive account.
        </p>

        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link
            href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-foreground underline underline-offset-4"
          >
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
