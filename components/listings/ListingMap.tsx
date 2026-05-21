"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

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

type ListingMapProps = {
  lat: number;
  lng: number;
  title: string;
  area: string;
};

export default function ListingMap({ lat, lng, title, area }: ListingMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: "clamp(220px, 40vh, 300px)", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p>{area}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
