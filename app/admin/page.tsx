import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <p className="mt-2 text-muted-foreground">Restricted to admin role.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/listings">Manage Listings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/reports">Manage Reports</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/leads">View Leads</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/import">Import PDF Rows</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/imported-leads">Imported Leads Workspace</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/service-providers">Service Providers</Link>
        </Button>
      </div>
    </main>
  );
}
