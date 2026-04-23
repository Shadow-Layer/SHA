import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ServiceProviderFeedback from "@/lib/models/ServiceProviderFeedback";
import ServiceProvider from "@/lib/models/ServiceProvider";
import { serializeFeedbackRecords } from "@/lib/service-provider-feedback";

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default async function ProviderDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/provider");
  }
  if (session.user.role !== "service_provider") {
    redirect("/dashboard");
  }

  await connectDB();
  const provider = await ServiceProvider.findOne({ userId: session.user.id }).lean().exec();
  const recentFeedback =
    provider?._id
      ? await ServiceProviderFeedback.find({
          providerId: provider._id,
          status: "active",
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
          .exec()
      : [];
  const serializedRecentFeedback = await serializeFeedbackRecords(recentFeedback);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Provider Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your SHA service listing and keep your onboarding details current.
      </p>

      {!provider ? (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-950">Finish your provider setup</h2>
          <p className="mt-2 text-sm text-amber-900">
            Your account exists, but your public service profile is not complete yet.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/providers/join">Continue onboarding</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold capitalize">{formatLabel(provider.status)}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="mt-2 text-lg font-semibold capitalize">
                {formatLabel(provider.category)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Photos</p>
              <p className="mt-2 text-lg font-semibold">
                {Array.isArray(provider.photos) ? provider.photos.length : 0}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="mt-2 text-lg font-semibold">
                {(typeof provider.rating === "number" ? provider.rating : 0).toFixed(1)} stars
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {typeof provider.feedbackCount === "number" ? provider.feedbackCount : 0} reviews
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Upvotes</p>
              <p className="mt-2 text-lg font-semibold">
                {Array.isArray(provider.upvotes) ? provider.upvotes.length : 0}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{provider.businessName}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {provider.description || "No description added yet."}
                </p>
              </div>
              <Button asChild>
                <Link href="/providers/join">Edit profile</Link>
              </Button>
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4">
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="mt-1 font-medium">{provider.phone}</dd>
                <dd className="text-muted-foreground">{provider.email || "No email added"}</dd>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <dt className="text-muted-foreground">Coverage</dt>
                <dd className="mt-1 font-medium">{provider.areasServed || "On request"}</dd>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <dt className="text-muted-foreground">Availability</dt>
                <dd className="mt-1 font-medium capitalize">
                  {formatLabel(provider.availability)}
                </dd>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <dt className="text-muted-foreground">Pricing</dt>
                <dd className="mt-1 font-medium">{provider.priceRange || "Contact for pricing"}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Recent Feedback</h2>
            {serializedRecentFeedback.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No reviews yet. Share your profile to get your first review.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {serializedRecentFeedback.map((feedback) => (
                  <article
                    key={feedback.id || `${feedback.createdAt}-${feedback.rating}`}
                    className="rounded-lg border bg-muted/20 p-4"
                  >
                    <p className="text-sm font-medium">
                      {"★".repeat(feedback.rating)}
                      {"☆".repeat(5 - feedback.rating)} {feedback.rating.toFixed(1)}
                    </p>
                    {feedback.comment ? (
                      <p className="mt-2 text-sm text-muted-foreground">{feedback.comment}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {feedback.authorName || "Anonymous"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
