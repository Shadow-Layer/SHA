import { redirect } from "next/navigation";

import AdminImportedLeadsClient from "@/components/admin/AdminImportedLeadsClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminImportedLeadsPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/imported-leads");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Imported Leads</h1>
      <p className="mt-2 text-muted-foreground">
        Manage PDF-imported landlords, outreach progress, and claim invites before listings enter
        the normal review queue.
      </p>
      <AdminImportedLeadsClient />
    </main>
  );
}
