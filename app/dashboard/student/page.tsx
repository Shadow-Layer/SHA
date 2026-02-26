import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import { getAuthSession } from "@/lib/auth";

export default async function StudentDashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/student");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Logged in as {session.user.email}</p>
      <p className="mt-4 inline-flex rounded-full border px-3 py-1 text-sm">
        Verified Student: {session.user.isVerifiedStudent ? "Yes" : "No"}
      </p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
