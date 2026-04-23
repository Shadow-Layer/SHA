import Link from "next/link";
import { redirect } from "next/navigation";

import ServiceProviderRegisterForm from "@/components/service-providers/ServiceProviderRegisterForm";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProvider from "@/lib/models/ServiceProvider";

type ProviderDraft = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContact: "whatsapp" | "call" | "email";
  category:
    | "transport"
    | "wifi_internet"
    | "moving"
    | "cleaning"
    | "repairs_handyman"
    | "food_catering"
    | "security"
    | "other";
  description: string;
  areasServed: string;
  availability: "always" | "weekdays" | "weekends" | "on_request";
  priceRange: string;
  pricingNotes: string;
  photos: string[];
  targetCustomers: "students" | "landlords" | "both";
  consentGiven: boolean;
};

const EMPTY_DRAFT: ProviderDraft = {
  businessName: "",
  contactName: "",
  phone: "",
  email: "",
  preferredContact: "whatsapp",
  category: "transport",
  description: "",
  areasServed: "",
  availability: "always",
  priceRange: "",
  pricingNotes: "",
  photos: [],
  targetCustomers: "students",
  consentGiven: false,
};

export default async function ProviderJoinPage() {
  const session = await getAuthSession();

  if (session?.user?.role === "service_provider" && session.user.onboardingCompleted) {
    redirect("/dashboard/provider");
  }

  let initialData = EMPTY_DRAFT;
  let providerId: string | undefined;
  let formMode: "register" | "edit" = "register";

  if (session?.user?.role === "service_provider") {
    await connectDB();
    const provider = await ServiceProvider.findOne({ userId: session.user.id }).lean().exec();

    if (provider) {
      providerId = String(provider._id);
      formMode = "edit";
      initialData = {
        businessName: typeof provider.businessName === "string" ? provider.businessName : "",
        contactName: typeof provider.contactName === "string" ? provider.contactName : "",
        phone: typeof provider.phone === "string" ? provider.phone : "",
        email: typeof provider.email === "string" ? provider.email : session.user.email ?? "",
        preferredContact:
          provider.preferredContact === "whatsapp" ||
          provider.preferredContact === "call" ||
          provider.preferredContact === "email"
            ? provider.preferredContact
            : "whatsapp",
        category:
          provider.category === "transport" ||
          provider.category === "wifi_internet" ||
          provider.category === "moving" ||
          provider.category === "cleaning" ||
          provider.category === "repairs_handyman" ||
          provider.category === "food_catering" ||
          provider.category === "security" ||
          provider.category === "other"
            ? provider.category
            : "transport",
        description: typeof provider.description === "string" ? provider.description : "",
        areasServed: typeof provider.areasServed === "string" ? provider.areasServed : "",
        availability:
          provider.availability === "always" ||
          provider.availability === "weekdays" ||
          provider.availability === "weekends" ||
          provider.availability === "on_request"
            ? provider.availability
            : "always",
        priceRange: typeof provider.priceRange === "string" ? provider.priceRange : "",
        pricingNotes: typeof provider.pricingNotes === "string" ? provider.pricingNotes : "",
        photos: Array.isArray(provider.photos)
          ? provider.photos.filter((photo: unknown): photo is string => typeof photo === "string")
          : [],
        targetCustomers:
          provider.targetCustomers === "students" ||
          provider.targetCustomers === "landlords" ||
          provider.targetCustomers === "both"
            ? provider.targetCustomers
            : "students",
        consentGiven: provider.consentGiven === true,
      };
    } else {
      initialData = {
        ...EMPTY_DRAFT,
        contactName: session.user.name ?? "",
        email: session.user.email ?? "",
      };
    }
  }

  const isSignedInWithDifferentRole =
    session?.user && session.user.role !== "service_provider" && session.user.role !== "admin";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            SHA Provider Network
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-tight">
            Reach students and landlords without depending on scattered referrals.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Join SHA as a transport operator, WiFi installer, mover, cleaner, handyman, caterer,
            or other housing-adjacent service provider in Mutare.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <h2 className="font-semibold">What you get</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Direct visibility in the SHA services directory</li>
                <li>A review queue that keeps the marketplace trusted</li>
                <li>A provider dashboard for profile updates and status tracking</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <h2 className="font-semibold">What we ask for</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Clear business details and honest pricing guidance</li>
                <li>Accurate coverage areas, contact preferences, and photos</li>
                <li>Consent to be listed and reviewed by the SHA team</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Each provider profile is reviewed before publication. Submitting this form does not
            publish your listing instantly.
          </div>
        </div>

        {isSignedInWithDifferentRole ? (
          <section className="rounded-2xl border bg-card p-8 shadow-sm">
            <h2 className="text-2xl font-semibold">This account already has a different role</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              You&apos;re currently signed in as a {session.user.role.replace("_", " ")}. Provider
              accounts use a separate role so the dashboard and moderation flow stay consistent.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/auth/login?callbackUrl=/providers/join">Use another account</Link>
              </Button>
            </div>
          </section>
        ) : (
          <ServiceProviderRegisterForm
            mode={formMode}
            initialData={initialData}
            initialAccountName={session?.user?.name ?? ""}
            initialAccountEmail={session?.user?.email ?? ""}
            providerId={providerId}
          />
        )}
      </section>
    </main>
  );
}
