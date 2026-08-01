import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "student" | "landlord" | "service_provider" | "admin";
      isVerifiedStudent: boolean;
      isInvited?: boolean;
      onboardingCompleted?: boolean;
      source?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "student" | "landlord" | "service_provider" | "admin";
    isVerifiedStudent: boolean;
    isInvited?: boolean;
    onboardingCompleted?: boolean;
    source?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: "student" | "landlord" | "service_provider" | "admin";
    isVerifiedStudent: boolean;
    isInvited?: boolean;
    onboardingCompleted?: boolean;
    source?: string;
  }
}
