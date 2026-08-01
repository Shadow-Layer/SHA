import RegisterForm from "@/components/auth/RegisterForm";

type RegisterPageProps = {
  searchParams: {
    callbackUrl?: string;
    role?: string;
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const callbackUrl = searchParams.callbackUrl ?? "/dashboard";
  const role =
    searchParams.role === "student" ||
    searchParams.role === "landlord" ||
    searchParams.role === "service_provider"
      ? searchParams.role
      : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join SHA as a student, landlord, or service provider.
        </p>

        <div className="mt-6">
          <RegisterForm callbackUrl={callbackUrl} initialRole={role} />
        </div>
      </section>
    </main>
  );
}
