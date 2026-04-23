import ProviderClaimForm from "@/components/service-providers/ProviderClaimForm";
import { connectDB } from "@/lib/db";
import { findServiceProviderInviteByToken } from "@/lib/service-provider-invites";

type ClaimProviderPageProps = {
  params: { token: string };
};

const EXPIRED_MESSAGE = "This link has expired. Contact SHA to request a new one.";

export default async function ClaimProviderPage({ params }: ClaimProviderPageProps) {
  const token = typeof params.token === "string" ? params.token : "";

  await connectDB();
  const inviteLookup = await findServiceProviderInviteByToken(token);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center px-4 py-10">
      {inviteLookup.valid ? (
        <ProviderClaimForm
          token={token}
          businessName={inviteLookup.provider.businessName}
          initialPhone={inviteLookup.provider.phone}
          initialEmail={inviteLookup.provider.email}
        />
      ) : (
        <section className="w-full rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Invite unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">{EXPIRED_MESSAGE}</p>
        </section>
      )}
    </main>
  );
}
