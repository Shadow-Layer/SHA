import crypto from "node:crypto";

import ServiceProvider from "@/lib/models/ServiceProvider";

type ServiceProviderInviteCandidate = {
  _id: unknown;
  businessName?: unknown;
  phone?: unknown;
  email?: unknown;
  status?: unknown;
  userId?: unknown;
  inviteTokenHash?: unknown;
  inviteTokenExpiresAt?: unknown;
};

export type ServiceProviderInviteLookupResult =
  | { valid: false; reason: "invalid" | "expired" }
  | {
      valid: true;
      provider: {
        id: string;
        businessName: string;
        phone: string;
        email: string;
        inviteTokenHash: string;
        inviteTokenExpiresAt: Date;
      };
    };

export function hashServiceProviderInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function findServiceProviderInviteByToken(
  token: string,
): Promise<ServiceProviderInviteLookupResult> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { valid: false, reason: "invalid" };
  }

  const inviteTokenHash = hashServiceProviderInviteToken(trimmedToken);
  const provider = (await ServiceProvider.findOne({ inviteTokenHash })
    .select({
      _id: 1,
      businessName: 1,
      phone: 1,
      email: 1,
      status: 1,
      userId: 1,
      inviteTokenHash: 1,
      inviteTokenExpiresAt: 1,
    })
    .lean()
    .exec()) as ServiceProviderInviteCandidate | null;

  if (!provider || provider.status !== "unclaimed" || provider.userId) {
    return { valid: false, reason: "invalid" };
  }

  if (
    typeof provider.inviteTokenHash !== "string" ||
    !(provider.inviteTokenExpiresAt instanceof Date)
  ) {
    return { valid: false, reason: "invalid" };
  }

  if (provider.inviteTokenExpiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    provider: {
      id: String(provider._id),
      businessName: typeof provider.businessName === "string" ? provider.businessName : "",
      phone: typeof provider.phone === "string" ? provider.phone : "",
      email: typeof provider.email === "string" ? provider.email : "",
      inviteTokenHash: provider.inviteTokenHash,
      inviteTokenExpiresAt: provider.inviteTokenExpiresAt,
    },
  };
}
