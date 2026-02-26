import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";

export default async function ForumPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/forum");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Forum</h1>
      <p className="mt-2 text-muted-foreground">Signed in as {session.user.role}</p>
    </main>
  );
}
