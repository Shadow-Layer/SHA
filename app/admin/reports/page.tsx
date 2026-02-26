import { redirect } from "next/navigation";

import AdminReportsClient from "@/components/admin/AdminReportsClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminReportsPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/reports");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Reports Queue</h1>
      <p className="mt-2 text-muted-foreground">
        Review flagged content and resolve reports in order of submission.
      </p>
      <AdminReportsClient />
    </main>
  );
}
