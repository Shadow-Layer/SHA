import { redirect } from "next/navigation";

import AdminServiceProvidersClient from "@/components/admin/AdminServiceProvidersClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminServiceProvidersPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/service-providers");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Service Providers</h1>
      <p className="mt-2 text-muted-foreground">
        Review provider submissions, publish approved services, and remove listings when needed.
      </p>
      <AdminServiceProvidersClient />
    </main>
  );
}
