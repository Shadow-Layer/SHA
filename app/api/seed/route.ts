import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Listing from "@/lib/models/Listing";
import VerificationEvent from "@/lib/models/VerificationEvent";
import Application from "@/lib/models/Application";
import Conversation from "@/lib/models/Conversation";
import Message from "@/lib/models/Message";
import ForumPost from "@/lib/models/ForumPost";
import ForumComment from "@/lib/models/ForumComment";
import Notification from "@/lib/models/Notification";

// POST-only route that seeds the database with demo/test data.  An explicit
// secret must be provided via the `x-seed-secret` header (or the body) and it
// is compared against the `SEED_SECRET` environment variable.  This endpoint
// is intentionally not exported as GET to avoid accidental invocation from a
// browser.

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-seed-secret");
  const expected = process.env.SEED_SECRET;

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // clear collections in dependency-safe order
  await Notification.deleteMany({});
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Application.deleteMany({});
  await VerificationEvent.deleteMany({});
  await ForumComment.deleteMany({});
  await ForumPost.deleteMany({});
  await Listing.deleteMany({});
  await User.deleteMany({});

  // create some users
  const commonPassword = await bcrypt.hash("password", 10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _admin = await User.create({
    name: "Admin User",
    username: "admin",
    email: "admin@example.com",
    hashedPassword: commonPassword,
    role: "admin",
  });
  const landlord = await User.create({
    name: "Landlord One",
    username: "landlord1",
    email: "landlord@example.com",
    hashedPassword: commonPassword,
    role: "landlord",
  });
  const student = await User.create({
    name: "Student Person",
    username: "student1",
    email: "student@example.com",
    hashedPassword: commonPassword,
    role: "student",
    isVerifiedStudent: true,
  });

  // listings for landlord
  const listing1 = await Listing.create({
    landlordId: landlord._id,
    title: "Cozy student flat",
    area: "Central Campus",
    landmark: "Library",
    occupancyOptions: [{ type: "per_room", rentAmount: 200 }],
    photos: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _listing2 = await Listing.create({
    landlordId: landlord._id,
    title: "Spacious house",
    area: "North Side",
    landmark: "Mall",
    occupancyOptions: [{ type: "full_house", rentAmount: 800 }],
    photos: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=80",
    ],
  });

  // verification events
  await VerificationEvent.create({
    listingId: listing1._id,
    studentId: student._id,
    type: "seen",
    note: "Passed by on way to class",
  });

  // application from student to listing1
  const application = await Application.create({
    listingId: listing1._id,
    studentId: student._id,
    landlordId: landlord._id,
    moveInDate: new Date(),
    occupancyPreference: "per_room",
    message: "I'm interested",
  });

  // conversation and some messages
  const convo = await Conversation.create({
    applicationId: application._id,
    listingId: listing1._id,
    studentId: student._id,
    landlordId: landlord._id,
  });
  await Message.create({
    conversationId: convo._id,
    senderId: student._id,
    body: "Hi, is the room still available?",
  });
  await Message.create({
    conversationId: convo._id,
    senderId: landlord._id,
    body: "Yes it is, when can you move in?",
  });

  // forum posts and comments
  const post = await ForumPost.create({
    authorId: student._id,
    category: "general",
    title: "Looking for a roommate",
    body: "Does anyone need a roommate near campus?",
  });
  await ForumComment.create({
    postId: post._id,
    authorId: landlord._id,
    body: "I might be interested",
  });

  // notifications
  await Notification.create({
    userId: landlord._id,
    type: "new_application",
    message: "Student Person applied to your listing",
    relatedId: String(application._id),
    relatedType: "application",
  });

  return NextResponse.json({
    users: 3,
    listings: 2,
    verificationEvents: 1,
    applications: 1,
    conversations: 1,
    messages: 2,
    forumPosts: 1,
    forumComments: 1,
    notifications: 1,
  });
}
