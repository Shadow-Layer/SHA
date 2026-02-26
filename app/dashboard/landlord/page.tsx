import { redirect } from "next/navigation";
import Link from "next/link";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Application from "@/lib/models/Application";
import Listing from "@/lib/models/Listing";
import User from "@/lib/models/User";
import ApplicationActions from "@/components/dashboard/ApplicationActions";
import { Button } from "@/components/ui/button";

type LandlordDashboardPageProps = {
  params: {};
  searchParams: { created?: string };
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

  await connectDB();
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
      {showCreatedBanner ? (
        <p className="mt-3 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          Your listing is under review. We'll notify you when it goes live.
        </p>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-semibold">My Listings</h2>
        {listings.length === 0 ? (
          <div className="mt-4 space-y-2 text-center">
            <p>You haven't listed any properties yet.</p>
            <Button asChild>
              <Link href="/dashboard/listings/new">Create your first listing</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
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
              const listing = listings.find((l) => String(l._id) === String(app.listingId));
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
