"use client";

import { type ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AMENITIES,
  OCCUPANCY_LABELS,
  type OccupancyType,
} from "@/components/dashboard/ListingWizard";
import { Button } from "@/components/ui/button";
import { toDisplayImageUrl } from "@/lib/media";

type OccupancyOption = {
  type?: string;
  occupancyType?: string;
  rentAmount?: number | null;
  rent?: number | null;
  description?: string | null;
};

type RegulationsState = {
  curfew: boolean;
  visitorsAllowed: boolean;
  noSmoking: boolean;
  noParties: boolean;
  quietHours: boolean;
  separateLease: boolean;
  noPets: boolean;
  tenantsCleaning: boolean;
  curfewTime: string;
  otherRegulations: string;
};

type InitialData = {
  title: string;
  area: string;
  landmark: string;
  occupancyOptions: OccupancyOption[];
  amenities: string[];
  regulations?: Partial<RegulationsState>;
  tenantPreferences: string[];
  photos: string[];
  pricingDisplayText?: string;
  importNotes?: string;
};

type OnboardingWizardProps = {
  listingId: string;
  initialData: InitialData;
};

type WizardState = {
  title: string;
  area: string;
  landmark: string;
  occupancy: Record<OccupancyType, boolean>;
  rents: Record<OccupancyType, string>;
  amenities: string[];
  regulations: RegulationsState;
  tenantPreferences: string[];
  photos: string[];
};

const TENANT_PREFERENCES = [
  "Female only",
  "Male only",
  "Christian tenants",
  "Quiet tenants",
  "No preference",
];

const EMPTY_REGULATIONS: RegulationsState = {
  curfew: false,
  visitorsAllowed: true,
  noSmoking: false,
  noParties: false,
  quietHours: false,
  separateLease: false,
  noPets: false,
  tenantsCleaning: false,
  curfewTime: "",
  otherRegulations: "",
};

const OCCUPANCY_ORDER: OccupancyType[] = [
  "per_room",
  "per_head_double",
  "per_head_triple_plus",
  "full_house",
];

const WIZARD_STEPS = [
  { value: 1, label: "Basic Info" },
  { value: 2, label: "Rent & Occupancy" },
  { value: 3, label: "Amenities & Rules" },
  { value: 4, label: "Photos" },
  { value: 5, label: "Consent" },
] as const;

function toRentString(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function detectOccupancyType(text: string): OccupancyType | null {
  const normalized = text.toLowerCase();

  if (normalized.includes("double")) {
    return "per_head_double";
  }
  if (
    normalized.includes("triple") ||
    normalized.includes("3+") ||
    normalized.includes("three sharing")
  ) {
    return "per_head_triple_plus";
  }
  if (normalized.includes("full house") || normalized.includes("whole house")) {
    return "full_house";
  }
  if (normalized.includes("room")) {
    return "per_room";
  }

  return null;
}

function parsePricingDisplayText(pricingDisplayText?: string) {
  const occupancy: Record<OccupancyType, boolean> = {
    per_room: false,
    per_head_double: false,
    per_head_triple_plus: false,
    full_house: false,
  };
  const rents: Record<OccupancyType, string> = {
    per_room: "",
    per_head_double: "",
    per_head_triple_plus: "",
    full_house: "",
  };

  if (!pricingDisplayText) {
    return { occupancy, rents };
  }

  const normalized = pricingDisplayText.replace(/\s+/g, " ").trim();
  const segments = normalized.split(/[;,/]|(?:\s+-\s+)/).map((part) => part.trim()).filter(Boolean);

  for (const segment of segments) {
    const match = segment.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) {
      continue;
    }

    const occupancyType = detectOccupancyType(segment);
    const amount = Number(match[1].replace(/,/g, ""));
    if (!occupancyType || !Number.isFinite(amount)) {
      continue;
    }

    occupancy[occupancyType] = true;
    rents[occupancyType] = String(amount);
  }

  if (!Object.values(occupancy).some(Boolean)) {
    const fallbackMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
    if (fallbackMatch) {
      occupancy.per_room = true;
      rents.per_room = fallbackMatch[1].replace(/,/g, "");
    }
  }

  return { occupancy, rents };
}

function buildInitialState(initialData: InitialData): WizardState {
  const occupancy: Record<OccupancyType, boolean> = {
    per_room: false,
    per_head_double: false,
    per_head_triple_plus: false,
    full_house: false,
  };
  const rents: Record<OccupancyType, string> = {
    per_room: "",
    per_head_double: "",
    per_head_triple_plus: "",
    full_house: "",
  };

  const importedOccupancy = Array.isArray(initialData.occupancyOptions)
    ? initialData.occupancyOptions
    : [];

  for (const option of importedOccupancy) {
    const type = option.type ?? option.occupancyType;
    if (!type || !OCCUPANCY_ORDER.includes(type as OccupancyType)) {
      continue;
    }

    const occupancyType = type as OccupancyType;
    occupancy[occupancyType] = true;
    rents[occupancyType] = toRentString(option.rentAmount ?? option.rent);
  }

  if (!Object.values(occupancy).some(Boolean)) {
    const parsed = parsePricingDisplayText(initialData.pricingDisplayText);
    Object.assign(occupancy, parsed.occupancy);
    Object.assign(rents, parsed.rents);
  }

  return {
    title: initialData.title ?? "",
    area: initialData.area ?? "",
    landmark: initialData.landmark ?? "",
    occupancy,
    rents,
    amenities: Array.isArray(initialData.amenities) ? initialData.amenities : [],
    regulations: {
      ...EMPTY_REGULATIONS,
      ...(initialData.regulations ?? {}),
    },
    tenantPreferences: Array.isArray(initialData.tenantPreferences)
      ? initialData.tenantPreferences
      : [],
    photos: Array.isArray(initialData.photos) ? initialData.photos : [],
  };
}

export default function OnboardingWizard({ listingId, initialData }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => buildInitialState(initialData));
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [confirmListing, setConfirmListing] = useState(false);
  const [confirmDirectContact, setConfirmDirectContact] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = confirmAccurate && confirmListing && confirmDirectContact;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Upload failed");
        }

        const data = (await response.json()) as { url?: string };
        if (typeof data.url === "string" && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setState((current) => ({
          ...current,
          photos: [...current.photos, ...uploadedUrls],
        }));
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const occupancyOptions = OCCUPANCY_ORDER.filter((key) => state.occupancy[key]).map((key) => ({
      type: key,
      rentAmount: state.rents[key] ? Number(state.rents[key]) : null,
    }));

    try {
      const response = await fetch(`/api/listings/${listingId}/complete`, {
        method: "PATCH",
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
          consentConfirmed: true,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to complete onboarding");
      }

      router.push("/dashboard/landlord?onboarded=1");
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to complete onboarding",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        We pre-filled this from an existing accommodation record. Please review and correct
        anything needed.
      </div>

      <div className="mt-3 rounded-md border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
        Imported notes: {initialData.importNotes?.trim() || "No extra import notes were captured."}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {WIZARD_STEPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStep(value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              step === value ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            {value}. {label}
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
              onChange={(event) => setState((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium">
            Area / neighbourhood
            <input
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={state.area}
              onChange={(event) => setState((current) => ({ ...current, area: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium">
            Landmark / address description
            <textarea
              rows={4}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              value={state.landmark}
              onChange={(event) =>
                setState((current) => ({ ...current, landmark: event.target.value }))
              }
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 space-y-4">
          {initialData.pricingDisplayText?.trim() ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Imported pricing note: {initialData.pricingDisplayText}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OCCUPANCY_ORDER.map((key) => (
              <label key={key} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.occupancy[key]}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        occupancy: {
                          ...current.occupancy,
                          [key]: event.target.checked,
                        },
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
                      setState((current) => ({
                        ...current,
                        rents: { ...current.rents, [key]: event.target.value },
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
                      setState((current) => ({
                        ...current,
                        amenities: event.target.checked
                          ? [...current.amenities, item.id]
                          : current.amenities.filter((value) => value !== item.id),
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
                ["separateLease", "Separate Lease"],
                ["noPets", "No Pets"],
                ["tenantsCleaning", "Tenants Clean Shared Areas"],
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(state.regulations[key as keyof RegulationsState])}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        regulations: {
                          ...current.regulations,
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
                    setState((current) => ({
                      ...current,
                      regulations: {
                        ...current.regulations,
                        curfewTime: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ) : null}
            <label className="mt-3 block text-sm font-medium">
              Other regulations
              <textarea
                rows={3}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                value={state.regulations.otherRegulations}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    regulations: {
                      ...current.regulations,
                      otherRegulations: event.target.value,
                    },
                  }))
                }
              />
            </label>
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
                      setState((current) => ({
                        ...current,
                        tenantPreferences: event.target.checked
                          ? [...current.tenantPreferences, item]
                          : current.tenantPreferences.filter((value) => value !== item),
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
              className="mt-2 block w-full text-sm"
              onChange={(event) => void handleFileChange(event)}
              disabled={uploading}
            />
          </label>
          {state.photos.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Listings without photos get significantly less interest. You can add photos later
              from your dashboard.
            </div>
          ) : null}
          {uploading ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
          {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {state.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo}
                src={toDisplayImageUrl(photo)}
                alt="Listing upload"
                className="h-28 w-full rounded-md object-cover"
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-semibold">SHA Terms</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-slate-700">
              <p>
                You confirm that this property information is accurate to the best of your
                knowledge and that SHA may display it to students after review and approval.
              </p>
              <p>
                Students will contact you directly through the platform and remain responsible for
                making their own housing decisions. SHA may moderate listings and remove inaccurate
                or unsafe content.
              </p>
              <p>
                Submission does not guarantee publication. Listings remain private until an admin
                review is complete and the listing is approved.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmAccurate}
                onChange={(event) => setConfirmAccurate(event.target.checked)}
              />
              <span>I confirm the information provided is accurate</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmListing}
                onChange={(event) => setConfirmListing(event.target.checked)}
              />
              <span>I agree to have my property listed on SHA</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmDirectContact}
                onChange={(event) => setConfirmDirectContact(event.target.checked)}
              />
              <span>I understand students will apply and contact me directly</span>
            </label>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">Review summary</p>
            <p className="mt-2">Title: {state.title || "-"}</p>
            <p>Area: {state.area || "-"}</p>
            <p>Landmark: {state.landmark || "-"}</p>
            <p>
              Amenities:{" "}
              {state.amenities
                .map((id) => AMENITIES.find((item) => item.id === id)?.label ?? id)
                .join(", ") || "-"}
            </p>
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
          onClick={() => setStep((current) => Math.max(current - 1, 1))}
        >
          Back
        </Button>
        {step < 5 ? (
          <Button
            type="button"
            onClick={() => setStep((current) => Math.min(current + 1, 5))}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isSubmitting || uploading || !canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </Button>
        )}
      </div>
    </section>
  );
}
