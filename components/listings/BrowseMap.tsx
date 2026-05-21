"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import { useMapCenter } from "@/lib/hooks/useMapCenter";
import type { ListingCardData } from "@/lib/listings";

delete (
  L.Icon.Default as unknown as {
    prototype: { _getIconUrl?: unknown };
  }
).prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type BrowseMapProps = {
  listings: ListingCardData[];
};

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return "Rent available on request";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BrowseMap({ listings }: BrowseMapProps) {
  const { center, status } = useMapCenter();
  const withCoords = listings.filter(
    (listing): listing is ListingCardData & { lat: number; lng: number } =>
      listing.lat !== null && listing.lng !== null,
  );
  const withoutCoords = listings.filter((listing) => listing.lat === null || listing.lng === null);

  return (
    <div className="space-y-4">
      {status === "denied" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Location access denied — showing Mutare region.
        </div>
      ) : null}
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "clamp(300px, 50vh, 500px)", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {withCoords.map((listing) => (
          <Marker key={listing.id} position={[listing.lat, listing.lng]}>
            <Popup>
              <div className="space-y-1">
                <p className="font-medium">{listing.title}</p>
                <p>{listing.area}</p>
                <p>{formatCurrency(listing.minRent)}</p>
                <Link href={`/listings/${listing.id}`}>View listing →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {withoutCoords.length > 0 ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Listings without map coordinates</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {withoutCoords.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block hover:text-foreground">
                {listing.title} · {listing.area}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
