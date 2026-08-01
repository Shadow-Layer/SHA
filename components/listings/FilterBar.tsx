"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const RENT_RANGES = [
  { value: "", label: "Any rent", minRent: "", maxRent: "" },
  { value: "0-100", label: "Up to $100", minRent: "0", maxRent: "100" },
  { value: "101-200", label: "$101 to $200", minRent: "101", maxRent: "200" },
  { value: "201-350", label: "$201 to $350", minRent: "201", maxRent: "350" },
  { value: "351-999999", label: "$351+", minRent: "351", maxRent: "" },
] as const;

const OCCUPANCY_OPTIONS = [
  { value: "", label: "Any occupancy" },
  { value: "per_head_double", label: "Per head (double)" },
  { value: "per_head_triple_plus", label: "Per head (triple+)" },
  { value: "per_room", label: "Per room" },
  { value: "full_house", label: "Full house" },
  { value: "custom", label: "Custom" },
] as const;

const AMENITY_OPTIONS = [
  { value: "", label: "Any amenity" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "backup_water", label: "Backup water" },
  { value: "solar_power", label: "Solar power" },
  { value: "parking", label: "Parking" },
  { value: "furnished", label: "Furnished" },
] as const;

type FilterBarProps = {
  initialArea?: string;
  initialMinRent?: number;
  initialMaxRent?: number;
  initialOccupancyType?: string;
  initialAmenity?: string;
};

function deriveRentRangeValue(minRent?: number, maxRent?: number): string {
  if (typeof minRent !== "number" && typeof maxRent !== "number") {
    return "";
  }

  const match = RENT_RANGES.find((range) => {
    const rangeMin = range.minRent ? Number(range.minRent) : undefined;
    const rangeMax = range.maxRent ? Number(range.maxRent) : undefined;
    return rangeMin === minRent && rangeMax === maxRent;
  });

  return match?.value ?? "";
}

export default function FilterBar({
  initialArea,
  initialMinRent,
  initialMaxRent,
  initialOccupancyType,
  initialAmenity,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [area, setArea] = useState(initialArea ?? "");
  const [rentRange, setRentRange] = useState(
    deriveRentRangeValue(initialMinRent, initialMaxRent),
  );
  const [occupancyType, setOccupancyType] = useState(initialOccupancyType ?? "");
  const [amenity, setAmenity] = useState(initialAmenity ?? "");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (area.trim()) {
      params.set("area", area.trim());
    } else {
      params.delete("area");
    }

    if (occupancyType) {
      params.set("occupancyType", occupancyType);
    } else {
      params.delete("occupancyType");
    }

    const selectedRange = RENT_RANGES.find((range) => range.value === rentRange);
    params.delete("minRent");
    params.delete("maxRent");
    if (selectedRange && selectedRange.value) {
      if (selectedRange.minRent) {
        params.set("minRent", selectedRange.minRent);
      }
      if (selectedRange.maxRent) {
        params.set("maxRent", selectedRange.maxRent);
      }
    }

    params.delete("amenities");
    if (amenity) {
      params.set("amenities", amenity);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onReset() {
    setArea("");
    setRentRange("");
    setOccupancyType("");
    setAmenity("");
    router.push(pathname);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 md:grid-cols-5 md:items-end"
    >
      <div className="space-y-1">
        <label htmlFor="area" className="text-sm font-medium">
          Area
        </label>
        <input
          id="area"
          type="text"
          value={area}
          onChange={(event) => setArea(event.target.value)}
          placeholder="Search by area"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="rentRange" className="text-sm font-medium">
          Rent range
        </label>
        <select
          id="rentRange"
          value={rentRange}
          onChange={(event) => setRentRange(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {RENT_RANGES.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="occupancyType" className="text-sm font-medium">
          Occupancy
        </label>
        <select
          id="occupancyType"
          value={occupancyType}
          onChange={(event) => setOccupancyType(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {OCCUPANCY_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="amenity" className="text-sm font-medium">
          Amenities
        </label>
        <select
          id="amenity"
          value={amenity}
          onChange={(event) => setAmenity(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {AMENITY_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Button type="submit" className="w-full">
          Apply
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
