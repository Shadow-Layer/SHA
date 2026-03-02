"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ListingWizardProps = {
  userId: string;
};

type OccupancyType =
  | "per_room"
  | "per_head_double"
  | "per_head_triple_plus"
  | "full_house";

type WizardState = {
  title: string;
  area: string;
  landmark: string;
  occupancy: Record<OccupancyType, boolean>;
  rents: Record<OccupancyType, string>;
  amenities: string[];
  regulations: {
    curfew: boolean;
    visitorsAllowed: boolean;
    noSmoking: boolean;
    noParties: boolean;
    quietHours: boolean;
    noPets: boolean;
    curfewTime: string;
  };
  tenantPreferences: string[];
  photos: string[];
};

const AMENITIES: { id: string; label: string }[] = [
  { id: 'wifi', label: 'WiFi' },
  { id: 'borehole', label: 'Borehole' },
  { id: 'prepaid_zesa', label: 'Prepaid ZESA' },
  { id: 'backup_power', label: 'Backup Power' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'ensuite', label: 'Ensuite' },
  { id: 'burglar_bars', label: 'Burglar Bars' },
  { id: 'parking', label: 'Parking' },
];

const TENANT_PREFERENCES = [
  "Female only",
  "Male only",
  "Christian tenants",
  "Quiet tenants",
  "No preference",
];

const EMPTY_STATE: WizardState = {
  title: "",
  area: "",
  landmark: "",
  occupancy: {
    per_room: false,
    per_head_double: false,
    per_head_triple_plus: false,
    full_house: false,
  },
  rents: {
    per_room: "",
    per_head_double: "",
    per_head_triple_plus: "",
    full_house: "",
  },
  amenities: [],
  regulations: {
    curfew: false,
    visitorsAllowed: true,
    noSmoking: false,
    noParties: false,
    quietHours: false,
    noPets: false,
    curfewTime: "",
  },
  tenantPreferences: [],
  photos: [],
};

const OCCUPANCY_LABELS: Record<OccupancyType, string> = {
  per_room: "Per Room",
  per_head_double: "Per Head (Double)",
  per_head_triple_plus: "Per Head (3+)",
  full_house: "Full House",
};

export default function ListingWizard({ userId }: ListingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !files.length) return;

    setUploading(true);
    setUploadError(null);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }

        const data = await res.json();
        if (data?.url) {
          newUrls.push(data.url);
        }
      }

      if (newUrls.length > 0) {
        setState((prev) => ({ ...prev, photos: [...new Set([...prev.photos, ...newUrls])] }));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  const storageKey = useMemo(() => `sha_draft_${userId}`, [userId]);

  useEffect(() => {
    const rawDraft = localStorage.getItem(storageKey);
    if (!rawDraft) {
      return;
    }
    try {
      const parsed = JSON.parse(rawDraft) as { step?: number; state?: WizardState };
      if (parsed.step && parsed.step >= 1 && parsed.step <= 4) {
        setStep(parsed.step);
      }
      if (parsed.state) {
        setState({ ...EMPTY_STATE, ...parsed.state });
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ step, state }));
  }, [step, state, storageKey]);

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    const occupancyOptions = (Object.keys(state.occupancy) as OccupancyType[])
      .filter((key) => state.occupancy[key])
      .map((key) => ({
        type: key,
        rentAmount: state.rents[key] ? Number(state.rents[key]) : null,
      }));

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          area: state.area,
          landmark: state.landmark,
          occupancyOptions,
          amenities: state.amenities,
          regulations: state.regulations,
          tenantPreferences: state.tenantPreferences,
          photos: state.photos,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create listing");
      }

      localStorage.removeItem(storageKey);
      router.push("/dashboard/landlord?created=1");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create listing");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Draft saved on this device. Switching devices will start fresh.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStep(value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              step === value ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            Step {value}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Property title
            <input
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={state.title}
              onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium">
            Area / neighbourhood
            <input
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={state.area}
              onChange={(event) => setState((prev) => ({ ...prev, area: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium">
            Landmark / address description
            <textarea
              rows={4}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={state.landmark}
              onChange={(event) => setState((prev) => ({ ...prev, landmark: event.target.value }))}
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(state.occupancy) as OccupancyType[]).map((key) => (
              <label key={key} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.occupancy[key]}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        occupancy: { ...prev.occupancy, [key]: event.target.checked },
                      }))
                    }
                  />
                  {OCCUPANCY_LABELS[key]}
                </div>
                {state.occupancy[key] ? (
                  <input
                    type="number"
                    min="0"
                    placeholder="Rent amount"
                    className="mt-3 w-full rounded-md border px-3 py-2 text-sm"
                    value={state.rents[key]}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        rents: { ...prev.rents, [key]: event.target.value },
                      }))
                    }
                  />
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold">Amenities</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AMENITIES.map((item) => (
                <label key={item.id} className="text-sm">
                  <input
                    type="checkbox"
                    checked={state.amenities.includes(item.id)}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        amenities: event.target.checked
                          ? [...prev.amenities, item.id]
                          : prev.amenities.filter((value) => value !== item.id),
                      }))
                    }
                  />{" "}
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Regulations</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["curfew", "Curfew"],
                ["visitorsAllowed", "Visitors Allowed"],
                ["noSmoking", "No Smoking"],
                ["noParties", "No Parties"],
                ["quietHours", "Quiet Hours"],
                ["noPets", "No Pets"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(state.regulations[key as keyof WizardState["regulations"]])}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        regulations: {
                          ...prev.regulations,
                          [key]: event.target.checked,
                        },
                      }))
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
            {state.regulations.curfew ? (
              <label className="mt-3 block text-sm font-medium">
                Curfew time
                <input
                  type="time"
                  className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  value={state.regulations.curfewTime}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      regulations: { ...prev.regulations, curfewTime: event.target.value },
                    }))
                  }
                />
              </label>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold">Tenant preferences</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TENANT_PREFERENCES.map((item) => (
                <label key={item} className="text-sm">
                  <input
                    type="checkbox"
                    checked={state.tenantPreferences.includes(item)}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        tenantPreferences: event.target.checked
                          ? [...prev.tenantPreferences, item]
                          : prev.tenantPreferences.filter((value) => value !== item),
                      }))
                    }
                  />{" "}
                  {item}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Upload photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-2 block w/full text-sm"
              onChange={(e) => void handleFileChange(e)}
              disabled={uploading}
            />
          </label>
          {uploading ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
          {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {state.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo} src={photo} alt="Listing upload" className="h-28 w-full rounded-md object-cover" />
            ))}
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">Review summary</p>
            <p className="mt-2">Title: {state.title || "-"}</p>
            <p>Area: {state.area || "-"}</p>
            <p>Landmark: {state.landmark || "-"}</p>
            <p>Amenities: {state.amenities.map(id => AMENITIES.find(a => a.id === id)?.label ?? id).join(", ") || "-"}</p>
            <p>Photos: {state.photos.length}</p>
          </div>
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
        >
          Back
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={() => setStep((prev) => Math.min(prev + 1, 4))}>
            Next
          </Button>
        ) : (
          <Button type="button" disabled={isSubmitting || uploading} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Submitting..." : "Submit listing"}
          </Button>
        )}
      </div>
    </section>
  );
}
