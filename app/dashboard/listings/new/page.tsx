import { redirect } from "next/navigation";

import ListingWizard from "@/components/dashboard/ListingWizard";
import { getAuthSession } from "@/lib/auth";

export default async function NewListingPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/listings/new");
  }
  if (session.user.role !== "landlord") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Create Listing</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete the 4-step wizard to submit a listing for review.
      </p>
      <ListingWizard userId={session.user.id} />
    </main>
  );
}
