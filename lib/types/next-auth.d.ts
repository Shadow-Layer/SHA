import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "student" | "landlord" | "admin";
      isVerifiedStudent: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "student" | "landlord" | "admin";
    isVerifiedStudent: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: "student" | "landlord" | "admin";
    isVerifiedStudent: boolean;
  }
}
