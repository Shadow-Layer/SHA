import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function ForumPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/forum");
  }
  redirect("/forum/houses");
}
