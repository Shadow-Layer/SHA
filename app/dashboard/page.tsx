import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "landlord") {
    redirect("/dashboard/landlord");
  }

  if (session.user.role === "student") {
    redirect("/dashboard/student");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back, {session.user.name}.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/admin">Open Admin</Link>
        </Button>
        <LogoutButton />
      </div>
    </main>
  );
}
