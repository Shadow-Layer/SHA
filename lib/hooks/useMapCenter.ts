"use client";

import { useEffect, useState } from "react";

type MapCenterStatus = "pending" | "granted" | "denied";

const DEFAULT_CENTER: [number, number] = [-17.8, 31.05];

export function useMapCenter(): {
  center: [number, number];
  status: MapCenterStatus;
} {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [status, setStatus] = useState<MapCenterStatus>("pending");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
    );
  }, []);

  return { center, status };
}
