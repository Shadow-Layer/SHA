import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: {
    token?: string | string[];
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token =
    typeof searchParams.token === "string"
      ? searchParams.token
      : Array.isArray(searchParams.token)
        ? searchParams.token[0] ?? null
        : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>

        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </section>
    </main>
  );
}
