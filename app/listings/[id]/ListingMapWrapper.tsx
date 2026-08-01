"use client";

import dynamic from "next/dynamic";

const ListingMap = dynamic(() => import("@/components/listings/ListingMap"), { ssr: false });

type ListingMapWrapperProps = {
  lat: number;
  lng: number;
  title: string;
  area: string;
};

export default function ListingMapWrapper({ lat, lng, title, area }: ListingMapWrapperProps) {
  return <ListingMap lat={lat} lng={lng} title={title} area={area} />;
}
