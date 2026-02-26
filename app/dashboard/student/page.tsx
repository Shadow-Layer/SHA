import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Application from "@/lib/models/Application";
import Listing from "@/lib/models/Listing";
import StudentApplicationsTable from "@/components/dashboard/StudentApplicationsTable";

export default async function StudentDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/student");
  }
  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  await connectDB();
  const applications = await Application.find({ studentId: session.user.id })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  const listingIds = applications.map((a) => a.listingId);
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select({ _id: 1, title: 1, area: 1, occupancyOptions: 1 })
    .lean()
    .exec();

  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const rows = applications.map((app) => {
    const listing = listingMap.get(String(app.listingId));
    let rent: number | null = null;
    if (listing?.occupancyOptions?.length) {
      const rentValues = listing.occupancyOptions
        .map((o) => (typeof o.rentAmount === "number" ? o.rentAmount : null))
        .filter((v): v is number => v !== null);
      if (rentValues.length) {
        rent = Math.min(...rentValues);
      }
    }
    return {
      id: String(app._id),
      listingId: String(app.listingId),
      listingTitle: listing?.title || "Listing",
      area: listing?.area || "-",
      rent,
      status: app.status,
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : String(app.createdAt),
    };
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">My Applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.user.isVerifiedStudent ? '✅ Verified Student' : 'Student'}
      </p>
      <div className="mt-6">
        <StudentApplicationsTable rows={rows} />
      </div>
    </main>
  );
}
