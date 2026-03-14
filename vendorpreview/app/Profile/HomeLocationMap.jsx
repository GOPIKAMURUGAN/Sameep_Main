"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_POSITION = {
  lat: 17.7414838,
  lng: 83.3342158,
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function normalizePosition(value, fallback = DEFAULT_POSITION) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }

  return { ...fallback };
}

function ClickHandler({ onPositionChange }) {
  useMapEvents({
    click(event) {
      const nextPosition = normalizePosition(event?.latlng);
      onPositionChange(nextPosition);
    },
  });

  return null;
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    const nextPosition = normalizePosition(position);
    map.setView([nextPosition.lat, nextPosition.lng], map.getZoom(), {
      animate: true,
    });
  }, [map, position]);

  return null;
}

export default function HomeLocationMap({ position, setPosition }) {
  const safePosition = useMemo(
    () => normalizePosition(position),
    [position]
  );

  const markerHandlers = useMemo(
    () => ({
      dragend(event) {
        const latlng = event?.target?.getLatLng?.();
        setPosition(normalizePosition(latlng, safePosition));
      },
    }),
    [safePosition, setPosition]
  );

  return (
    <MapContainer
      center={[safePosition.lat, safePosition.lng]}
      zoom={13}
      scrollWheelZoom
      style={{ height: "350px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker
        position={[safePosition.lat, safePosition.lng]}
        draggable
        eventHandlers={markerHandlers}
      />

      <ClickHandler onPositionChange={setPosition} />
      <RecenterMap position={safePosition} />
    </MapContainer>
  );
}
