"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ApplicationActionsProps = {
  applicationId: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
};

export default function ApplicationActions({ applicationId, status }: ApplicationActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"accept" | "reject" | null>(null);

  if (status !== "pending") {
    return null;
  }

  async function runAction(action: "accept" | "reject") {
    setError(null);
    setLoadingAction(action);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to update application");
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update application.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(loadingAction)}
          onClick={() => runAction("accept")}
        >
          {loadingAction === "accept" ? "Accepting..." : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(loadingAction)}
          onClick={() => runAction("reject")}
        >
          {loadingAction === "reject" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
