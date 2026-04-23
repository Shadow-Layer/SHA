import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import type { Types } from "mongoose";

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
import ServiceProvider from "@/lib/models/ServiceProvider";
import ServiceProviderFeedback from "@/lib/models/ServiceProviderFeedback";
import ServiceProviderOutreachEvent from "@/lib/models/ServiceProviderOutreachEvent";

type SeededForumPost = {
  _id: Types.ObjectId;
  category: string;
};

// POST-only route that seeds the database with demo/test data.  An explicit
// secret must be provided via the `x-seed-secret` header (or the body) and it
// is compared against the `SEED_SECRET` environment variable.  This endpoint
// is intentionally not exported as GET to avoid accidental invocation from a
// browser.

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-seed-secret");
  const expected = process.env.SEED_SECRET;
  const seedPassword = "password";

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
  await ServiceProviderFeedback.deleteMany({});
  await ServiceProviderOutreachEvent.deleteMany({});
  await ServiceProvider.deleteMany({});
  await User.deleteMany({});

  // create some users
  const commonPassword = await bcrypt.hash(seedPassword, 10);
  const admin = await User.create({
    name: "Admin User",
    username: "admin",
    email: "admin@example.com",
    hashedPassword: commonPassword,
    role: "admin",
  });
  const landlord1 = await User.create({
    name: "Landlord One",
    username: "landlord1",
    email: "landlord1@example.com",
    hashedPassword: commonPassword,
    role: "landlord",
  });
  const landlord2 = await User.create({
    name: "Landlord Two",
    username: "landlord2",
    email: "landlord2@example.com",
    hashedPassword: commonPassword,
    role: "landlord",
  });
  const student1 = await User.create({
    name: "Student One",
    username: "student1",
    email: "student1@example.com",
    hashedPassword: commonPassword,
    role: "student",
    isVerifiedStudent: false,
  });
  const student2 = await User.create({
    name: "Student Two",
    username: "student2",
    email: "student2@example.com",
    hashedPassword: commonPassword,
    role: "student",
    isVerifiedStudent: false,
  });
  const student3 = await User.create({
    name: "Verified Student",
    username: "student3",
    email: "s123@africau.edu",
    hashedPassword: commonPassword,
    role: "student",
    isVerifiedStudent: true,
  });

  // listings for landlord
  const listingGreenside = await Listing.create({
    landlordId: landlord1._id,
    title: "Greenside Garden Rooms",
    area: "Greenside",
    landmark: "Botanical Gardens",
    occupancyOptions: [{ type: "per_room", rentAmount: 80 }],
    amenities: ["wifi", "kitchen"],
    photos: [],
    status: "published",
    verificationLevel: "landlord_confirmed",
    confirmationCount: 0,
    suspiciousCount: 1,
  });
  const listingChikanga = await Listing.create({
    landlordId: landlord1._id,
    title: "Chikanga Flats",
    area: "Chikanga",
    landmark: "Chikanga Shops",
    occupancyOptions: [{ type: "per_head_double", rentAmount: 120 }],
    amenities: ["parking"],
    photos: [],
    status: "published",
    verificationLevel: "landlord_confirmed",
    confirmationCount: 2,
    suspiciousCount: 0,
  });
  const listingSakubva = await Listing.create({
    landlordId: landlord2._id,
    title: "Sakubva Courtyard House",
    area: "Sakubva",
    landmark: "Market",
    occupancyOptions: [{ type: "full_house", rentAmount: 250 }],
    amenities: ["borehole", "wifi"],
    photos: [],
    status: "published",
    verificationLevel: "student_verified",
    confirmationCount: 3,
    suspiciousCount: 0,
  });
  const listingWarning = await Listing.create({
    landlordId: landlord2._id,
    title: "Central Campus Annex",
    area: "Central Campus",
    landmark: "Library",
    occupancyOptions: [{ type: "per_room", rentAmount: 60 }],
    amenities: ["wifi", "laundry"],
    photos: [],
    status: "warning",
    verificationLevel: "landlord_confirmed",
    confirmationCount: 0,
    suspiciousCount: 2,
  });
  const listingPending = await Listing.create({
    landlordId: landlord2._id,
    title: "North Side Studio (Pending)",
    area: "North Side",
    landmark: "Mall",
    occupancyOptions: [{ type: "per_room", rentAmount: 140 }],
    amenities: ["parking", "backup_power"],
    photos: [],
    status: "pending_review",
    verificationLevel: "landlord_confirmed",
    confirmationCount: 0,
    suspiciousCount: 0,
  });

  const serviceProviders = await ServiceProvider.create([
    {
      userId: null,
      businessName: "Mutare Fast Movers",
      contactName: "Tendai Moyo",
      phone: "0771234567",
      preferredContact: "whatsapp",
      category: "moving",
      description: "Affordable student moving services across Mutare",
      areasServed: "Greenside, Chikanga, CBD",
      availability: "always",
      priceRange: "$10-$30",
      targetCustomers: "students",
      photos: [],
      status: "published",
      contactStatus: "not_contacted",
      rating: 0,
      upvotes: [],
      feedbackCount: 0,
      consentGiven: true,
      source: "admin_created",
    },
    {
      userId: null,
      businessName: "ConnectEase WiFi",
      contactName: "Rudo Chikwanda",
      phone: "0782345678",
      preferredContact: "whatsapp",
      category: "wifi_internet",
      description: "WiFi installation and monthly packages for student houses",
      areasServed: "Mutare CBD, Yeovil, Fairbridge",
      availability: "weekdays",
      priceRange: "From $10/month",
      targetCustomers: "both",
      photos: [],
      status: "published",
      contactStatus: "not_contacted",
      rating: 0,
      upvotes: [],
      feedbackCount: 0,
      consentGiven: true,
      source: "admin_created",
    },
    {
      userId: null,
      businessName: "Sparkle Clean",
      contactName: "Mercy Dube",
      phone: "0793456789",
      preferredContact: "call",
      category: "cleaning",
      description: "Professional cleaning for student rooms and houses",
      areasServed: "All Mutare areas",
      availability: "on_request",
      priceRange: "$8-$25",
      targetCustomers: "both",
      photos: [],
      status: "published",
      contactStatus: "not_contacted",
      rating: 0,
      upvotes: [],
      feedbackCount: 0,
      consentGiven: true,
      source: "admin_created",
    },
  ]);

  // verification events
  await VerificationEvent.create([
    {
      listingId: listingGreenside._id,
      studentId: student1._id,
      type: "suspicious",
      note: "Listing details felt incomplete.",
    },
    {
      listingId: listingChikanga._id,
      studentId: student1._id,
      type: "seen",
      note: "Visited during a viewing.",
    },
    {
      listingId: listingChikanga._id,
      studentId: student2._id,
      type: "seen",
      note: "Friend stayed there last term.",
    },
    {
      listingId: listingSakubva._id,
      studentId: student1._id,
      type: "stayed",
      note: "Stayed here last semester.",
    },
    {
      listingId: listingSakubva._id,
      studentId: student2._id,
      type: "seen",
      note: "Visited a friend here.",
    },
    {
      listingId: listingSakubva._id,
      studentId: student3._id,
      type: "seen",
      note: "Walked by often.",
    },
    {
      listingId: listingWarning._id,
      studentId: student1._id,
      type: "suspicious",
      note: "Phone number kept changing.",
    },
    {
      listingId: listingWarning._id,
      studentId: student2._id,
      type: "suspicious",
      note: "Photos look inconsistent.",
    },
  ]);

  // application from student to listing1
  const pendingApplication = await Application.create({
    listingId: listingGreenside._id,
    studentId: student1._id,
    landlordId: landlord1._id,
    moveInDate: new Date(),
    occupancyPreference: "per_room",
    message: "Is the room still available?",
    status: "pending",
  });
  const acceptedApplication = await Application.create({
    listingId: listingChikanga._id,
    studentId: student2._id,
    landlordId: landlord1._id,
    moveInDate: new Date(),
    occupancyPreference: "per_head_double",
    message: "Looking to move in next month.",
    status: "accepted",
  });

  // conversation and some messages
  const convo = await Conversation.create({
    applicationId: acceptedApplication._id,
    listingId: listingChikanga._id,
    studentId: student2._id,
    landlordId: landlord1._id,
  });
  await Message.create({
    conversationId: convo._id,
    senderId: student2._id,
    body: "Hi, thanks for accepting. When can I view the place?",
  });
  await Message.create({
    conversationId: convo._id,
    senderId: landlord1._id,
    body: "This weekend works. Let me know a time.",
  });

  // forum posts and comments
  const forumPosts = await ForumPost.create([
    {
      authorId: student1._id,
      category: "houses",
      title: "Greenside room experiences?",
      body: "Has anyone stayed around Greenside recently?",
    },
    {
      authorId: student1._id,
      category: "landlords",
      title: "Landlord response times",
      body: "How fast do landlords usually respond?",
    },
    {
      authorId: student2._id,
      category: "locations",
      title: "Quiet spots near Sakubva",
      body: "Looking for quieter areas with good transport.",
    },
    {
      authorId: student2._id,
      category: "amenities",
      title: "WiFi reliability",
      body: "Which listings have stable WiFi?",
    },
    {
      authorId: student3._id,
      category: "service_providers",
      title: "Reliable moving services?",
      body: "Any recommendations for affordable movers?",
    },
    {
      authorId: student3._id,
      category: "general",
      title: "Roommate search tips",
      body: "Best places to find roommates?",
    },
  ]);
  const housesPost = forumPosts.find(
    (item: SeededForumPost) => item.category === "houses"
  );
  if (housesPost) {
    await ForumComment.create({
      postId: housesPost._id,
      authorId: student2._id,
      body: "I stayed nearby last year and it was decent.",
    });
  }

  // notifications
  await Notification.create([
    {
      userId: landlord1._id,
      type: "new_application",
      message: "Student One applied to your listing",
      relatedId: String(pendingApplication._id),
      relatedType: "application",
    },
    {
      userId: student2._id,
      type: "application_accepted",
      message: "Your application for Chikanga Flats was accepted.",
      relatedId: String(acceptedApplication._id),
      relatedType: "application",
    },
    {
      userId: student1._id,
      type: "application_rejected",
      message: "Your application for Greenside Garden Rooms was rejected.",
      relatedId: String(pendingApplication._id),
      relatedType: "application",
    },
    {
      userId: landlord2._id,
      type: "listing_approved",
      message: "Your listing Sakubva Courtyard House is now live.",
      relatedId: String(listingSakubva._id),
      relatedType: "listing",
    },
    {
      userId: landlord2._id,
      type: "listing_rejected",
      message: "Your listing North Side Studio (Pending) was removed by admin.",
      relatedId: String(listingPending._id),
      relatedType: "listing",
    },
  ]);

  return NextResponse.json({
    adminCredentials: {
      email: admin.email,
      password: seedPassword,
      role: admin.role,
      username: admin.username,
    },
    users: 6,
    listings: 5,
    verificationEvents: 8,
    applications: 2,
    conversations: 1,
    messages: 2,
    forumPosts: 6,
    forumComments: housesPost ? 1 : 0,
    notifications: 5,
    serviceProviders: serviceProviders.length,
  });
}
