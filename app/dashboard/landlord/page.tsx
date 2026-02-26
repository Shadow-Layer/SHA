import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { getAuthSession } from "@/lib/auth";

export default async function LandlordDashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/landlord");
  }

  if (session.user.role !== "landlord") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Landlord Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome, {session.user.name}.</p>
      <p className="mt-4 text-sm">Role in session: {session.user.role}</p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
