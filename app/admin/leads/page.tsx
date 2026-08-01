import { redirect } from "next/navigation";

import AdminLeadsClient from "@/components/admin/AdminLeadsClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminLeadsPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/leads");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Housing Leads</h1>
      <p className="mt-2 text-muted-foreground">Anonymous leads submitted by visitors.</p>
      <AdminLeadsClient />
    </main>
  );
}
