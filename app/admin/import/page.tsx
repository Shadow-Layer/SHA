import Link from "next/link";
import { redirect } from "next/navigation";

import AdminImportClient from "@/components/admin/AdminImportClient";
import AdminSPImportClient from "@/components/admin/AdminSPImportClient";
import { getAuthSession } from "@/lib/auth";

type AdminImportPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default async function AdminImportPage({ searchParams }: AdminImportPageProps) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/import");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const activeTab = searchParams?.tab === "service-providers" ? "service-providers" : "landlords";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">PDF Import</h1>
      <p className="mt-2 text-muted-foreground">
        Paste normalized JSON rows from the university accommodation PDF to seed landlords, draft
        listings, or unclaimed service providers.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 rounded-xl border bg-muted/40 p-2">
        <Link
          href="/admin/import"
          className={
            activeTab === "landlords"
              ? "rounded-lg bg-background px-4 py-2 text-sm font-medium shadow-sm"
              : "rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground"
          }
        >
          Landlords
        </Link>
        <Link
          href="/admin/import?tab=service-providers"
          className={
            activeTab === "service-providers"
              ? "rounded-lg bg-background px-4 py-2 text-sm font-medium shadow-sm"
              : "rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground"
          }
        >
          Service Providers
        </Link>
      </div>

      {activeTab === "service-providers" ? <AdminSPImportClient /> : <AdminImportClient />}
    </main>
  );
}
