"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// ✅ Client-only Leaflet map
const HomeLocationMap = dynamic(
  () => import("./HomeLocationMap"),
  { ssr: false }
);

export default function HomeLocationModal({ vendorId, onClose }) {
  const [position, setPosition] = useState({
    lat: 17.7414838,
    lng: 83.3342158,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      if (!vendorId) {
        alert("Vendor ID missing");
        return;
      }

      setSaving(true);
      const token = localStorage.getItem("token");

      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-vendors/${vendorId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            homeLocation: {
              lat: position.lat,
              lng: position.lng,
              areaCity: "",
              address: "",
            },
          }),
        }
      );

      onClose();
    } catch (err) {
      console.error("Failed to save location", err);
      alert("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card large">
        <h3>Set Home Location</h3>

        {/* ✅ Leaflet renders ONLY in browser */}
        <HomeLocationMap
          position={position}
          setPosition={setPosition}
        />

        <p style={{ marginTop: 8 }}>
          <strong>Marker (live):</strong>{" "}
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>

        <div className="popup-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
