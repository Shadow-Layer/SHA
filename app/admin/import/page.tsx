import { redirect } from "next/navigation";

import AdminImportClient from "@/components/admin/AdminImportClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminImportPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/import");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">PDF Import</h1>
      <p className="mt-2 text-muted-foreground">
        Paste normalized JSON rows from the university accommodation PDF to seed landlords and
        draft listings.
      </p>
      <AdminImportClient />
    </main>
  );
}
