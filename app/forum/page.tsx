import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function ForumPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/forum");
  }
  if (session.user.role === "landlord" || session.user.role === "admin") {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The forum is currently available to students only. Landlord and admin accounts cannot
          post or comment.
        </div>
      </main>
    );
  }
  redirect("/forum/houses");
}
