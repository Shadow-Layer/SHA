import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "landlord", "admin"],
      required: true,
    },
    isVerifiedStudent: { type: Boolean, default: false },
    phone: { type: String },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
