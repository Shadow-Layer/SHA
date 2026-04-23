import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "landlord", "service_provider", "admin"],
      required: true,
    },
    isVerifiedStudent: { type: Boolean, default: false },
    phone: { type: String },
    isInvited: { type: Boolean, default: false },
    inviteStatus: {
      type: String,
      enum: ["imported", "invited", "claimed", "onboarded"],
    },
    inviteTokenHash: { type: String },
    inviteTokenExpiresAt: { type: Date },
    consentGiven: { type: Boolean, default: false },
    consentAt: { type: Date },
    source: {
      type: String,
      enum: ["manual", "pdf_import", "self_signup"],
      default: "self_signup",
    },
    passwordSetAt: { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
    contactStatus: {
      type: String,
      enum: [
        "not_contacted",
        "contacted",
        "interested",
        "declined",
        "unreachable",
        "invited",
        "claimed",
      ],
      default: "not_contacted",
    },
    contactedAt: { type: Date },
    lastContactMethod: {
      type: String,
      enum: ["call", "whatsapp", "in_person"],
    },
    lastContactNotes: { type: String },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
