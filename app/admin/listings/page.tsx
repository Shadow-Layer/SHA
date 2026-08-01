import { redirect } from "next/navigation";

import AdminListingsClient from "@/components/admin/AdminListingsClient";
import { getAuthSession } from "@/lib/auth";

export default async function AdminListingsPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/listings");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Listing Approval Queue</h1>
      <p className="mt-2 text-muted-foreground">
        Moderate listings by approving, rejecting, and reviewing status queues.
      </p>
      <AdminListingsClient />
    </main>
  );
}
