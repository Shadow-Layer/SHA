import { redirect } from "next/navigation";
import Link from "next/link";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Application from "@/lib/models/Application";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";
import ApplicationActions from "@/components/dashboard/ApplicationActions";
import DismissibleBanner from "@/components/dashboard/DismissibleBanner";
import { Button } from "@/components/ui/button";

type LandlordDashboardPageProps = {
  searchParams: { created?: string; onboarded?: string };
};

export default async function LandlordDashboardPage({ searchParams }: LandlordDashboardPageProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/landlord");
  }
  if (session.user.role !== "landlord") {
    redirect("/dashboard");
  }

  const showCreatedBanner = searchParams.created === "1";
  const showOnboardedBanner = searchParams.onboarded === "1";
  const onboardedBannerMessage =
    "Your listing has been submitted for review. We'll notify you once it's approved.";

  await connectDB();
  const landlord = await User.findById(session.user.id)
    .select({ onboardingCompleted: 1 })
    .lean()
    .exec();
  const onboardingCompleted = landlord?.onboardingCompleted === true;

  const listings = await Listing.find({ landlordId: session.user.id })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const listingIds = listings.map((l) => String(l._id));

  const applications = await Application.find({
    landlordId: session.user.id,
    listingId: { $in: listingIds },
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const studentIds = applications.map((a) => String(a.studentId));
  const students = await User.find({ _id: { $in: studentIds } })
    .select({ _id: 1, name: 1, email: 1, isVerifiedStudent: 1 })
    .lean()
    .exec();
  const studentMap = new Map(students.map((u) => [String(u._id), u]));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Landlord Dashboard</h1>
      {showOnboardedBanner ? (
        <section aria-live="polite">
          <DismissibleBanner message={onboardedBannerMessage} />
        </section>
      ) : null}
      {showCreatedBanner ? (
        <p className="mt-3 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          Your listing is under review. We&apos;ll notify you when it goes live.
        </p>
      ) : null}
      {!onboardingCompleted ? (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-950">Complete Your Listing</h2>
              <p className="mt-2 text-sm text-amber-900">
                Your listing is not yet visible to students.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-amber-950">
                <li>✅ Account created</li>
                <li>✅ Password set</li>
                <li>⬜ Review property details</li>
                <li>⬜ Add rent options</li>
                <li>⬜ Upload photos</li>
                <li>⬜ Confirm consent</li>
                <li>⬜ Submit for review</li>
              </ul>
            </div>
            <div className="shrink-0">
              <Button asChild>
                <Link href="/onboarding/landlord">Continue Setup →</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-semibold">My Listings</h2>
        {listings.length === 0 ? (
          <div className="mt-4 space-y-2 text-center">
            <p>You haven&apos;t listed any properties yet.</p>
            <Button asChild>
              <Link href="/dashboard/listings/new">Create your first listing</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[500px] w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Area</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={String(l._id)} className="border-t border-border">
                    <td className="px-4 py-3">{l.title}</td>
                    <td className="px-4 py-3">{l.area}</td>
                    <td className="px-4 py-3 capitalize">{l.status}</td>
                    <td className="px-4 py-3">
                      <Link href={`/listings/${l._id}`} className="text-primary underline">
                        View
                      </Link>
                      {" | "}
                      <Link href={`/dashboard/listings/${l._id}`} className="text-primary underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Applications</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {applications.map((app) => {
              const student = studentMap.get(String(app.studentId));
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const _listing = listings.find((l) => String(l._id) === String(app.listingId));
              return (
                <div
                  key={String(app._id)}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <p className="font-medium">{student?.name || "Unknown student"}</p>
                  {student?.isVerifiedStudent ? (
                    <span className="text-xs text-green-600">Verified Student</span>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Move-in: {app.moveInDate || "N/A"} · Occupancy: {app.occupancyPreference || "N/A"}
                  </p>
                  <p className="text-sm">Message: {app.message || "—"}</p>
                  <div className="mt-2">
                    <ApplicationActions applicationId={String(app._id)} status={app.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
