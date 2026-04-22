"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

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
  const withCoords = listings.filter(
    (listing): listing is ListingCardData & { lat: number; lng: number } =>
      listing.lat !== null && listing.lng !== null,
  );
  const withoutCoords = listings.filter((listing) => listing.lat === null || listing.lng === null);
  const center: [number, number] = withCoords[0]
    ? [withCoords[0].lat, withCoords[0].lng]
    : [-17.8, 31.05];

  return (
    <div className="space-y-4">
      <MapContainer center={center} zoom={15} style={{ height: "500px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
