import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb-client";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  ...(process.env.MONGODB_URI ? { adapter: MongoDBAdapter(clientPromise) } : {}),
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await connectDB();

        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        }).lean();

        if (!user) {
          throw new Error("ACCOUNT_NOT_FOUND");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!isValid) {
          throw new Error("INVALID_CREDENTIALS");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isVerifiedStudent: user.isVerifiedStudent,
          isInvited: user.isInvited,
          onboardingCompleted: user.onboardingCompleted,
          source: user.source,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.isVerifiedStudent = Boolean(user.isVerifiedStudent);
        token.isInvited = Boolean(user.isInvited);
        token.onboardingCompleted = Boolean(user.onboardingCompleted);
        token.source = typeof user.source === "string" ? user.source : undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.isVerifiedStudent = Boolean(token.isVerifiedStudent);
        session.user.isInvited = Boolean(token.isInvited);
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
        session.user.source = token.source;
      }

      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions).catch(() => null);
}
