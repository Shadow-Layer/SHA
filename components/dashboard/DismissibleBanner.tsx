"use client";

import { useState } from "react";

type DismissibleBannerProps = {
  message: string;
  tone?: "success";
};

export default function DismissibleBanner({
  message,
  tone = "success",
}: DismissibleBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const toneClassName =
    tone === "success"
      ? "border-green-300 bg-green-50 text-green-900"
      : "border-slate-300 bg-slate-50 text-slate-900";

  return (
    <div className={`mt-3 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${toneClassName}`}>
      <p>{message}</p>
      <button
        type="button"
        className="shrink-0 rounded border border-current/20 px-2 py-1 text-xs font-medium"
        onClick={() => setVisible(false)}
      >
        Dismiss
      </button>
    </div>
  );
}
