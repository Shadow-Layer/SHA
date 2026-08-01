import { redirect } from "next/navigation";

import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";

export default async function LandlordOnboardingPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/onboarding/landlord");
  }
  if (session.user.role !== "landlord") {
    redirect("/dashboard");
  }
  await connectDB();
  const landlord = await User.findById(session.user.id)
    .select({ onboardingCompleted: 1 })
    .lean()
    .exec();

  if (landlord?.onboardingCompleted === true) {
    redirect("/dashboard/landlord");
  }

  const listing = await Listing.findOne({
    landlordId: session.user.id,
    status: "awaiting_landlord_completion",
  })
    .lean()
    .exec();

  if (!listing) {
    redirect("/dashboard/landlord");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Complete Your Listing</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review the imported details, update anything inaccurate, and submit your property for
        admin review.
      </p>
      <OnboardingWizard
        listingId={String(listing._id)}
        initialData={{
          title: listing.title,
          area: listing.area,
          landmark: typeof listing.landmark === "string" ? listing.landmark : "",
          occupancyOptions: Array.isArray(listing.occupancyOptions) ? listing.occupancyOptions : [],
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
          regulations:
            listing.regulations && typeof listing.regulations === "object"
              ? listing.regulations
              : {},
          tenantPreferences: Array.isArray(listing.tenantPreferences)
            ? listing.tenantPreferences
            : [],
          photos: Array.isArray(listing.photos) ? listing.photos : [],
          pricingDisplayText:
            typeof listing.pricingDisplayText === "string" ? listing.pricingDisplayText : "",
          importNotes: typeof listing.importNotes === "string" ? listing.importNotes : "",
        }}
      />
    </main>
  );
}
