"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { API_BASE_URL } from "../../config";
import { useVendor } from "@/app/context/VendorContext";

const DEFAULT_POSITION = {
  lat: 17.7414838,
  lng: 83.3342158,
};

const HomeLocationMap = dynamic(() => import("./HomeLocationMap"), {
  ssr: false,
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

export default function HomeLocationModal({
  vendorId,
  initialPosition,
  onClose,
  onSaved,
}) {
  const { setVendorInfo } = useVendor();
  const [position, setPosition] = useState(() =>
    normalizePosition(initialPosition)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPosition((current) => normalizePosition(initialPosition, current));
  }, [initialPosition]);

  const safePosition = useMemo(
    () => normalizePosition(position),
    [position]
  );

  const handlePositionChange = (nextPosition) => {
    setPosition(normalizePosition(nextPosition, safePosition));
  };

  const handleSave = async () => {
    if (!vendorId) {
      alert("Vendor ID missing");
      return;
    }

    const lat = Number(safePosition?.lat);
    const lng = Number(safePosition?.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.error("Invalid home location prevented from saving", {
        vendorId,
        position,
        safePosition,
      });
      alert("Invalid location selected");
      return;
    }

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "";

    const payload = {
      lat,
      lng,
      areaCity: "",
      address: "",
    };

    try {
      setSaving(true);
      const nextPosition = { lat, lng };
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const parseResponse = async (response, endpointLabel) => {
        const rawText = await response.text();
        let data = {};

        if (rawText) {
          try {
            data = JSON.parse(rawText);
          } catch (parseError) {
            console.warn(`${endpointLabel} response was not valid JSON`, {
              parseError,
              rawText,
            });
          }
        }

        if (!response.ok) {
          console.error(`${endpointLabel} update failed`, {
            status: response.status,
            statusText: response.statusText,
            data,
            rawText,
          });
          throw new Error(
            data?.message ||
              `Failed to update home location via ${endpointLabel} (${response.status})`
          );
        }

        return data;
      };

      console.log("Saving vendor home location to main vendor API", {
        vendorId,
        endpoint: `${API_BASE_URL}/api/vendors/${vendorId}/location`,
        payload,
        hasToken: Boolean(token),
      });

      const vendorRes = await fetch(
        `${API_BASE_URL}/api/vendors/${vendorId}/location`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const vendorData = await parseResponse(vendorRes, "main vendor API");

      console.log("Saving vendor home location to dummy vendor API", {
        vendorId,
        endpoint: `${API_BASE_URL}/api/dummy-vendors/${vendorId}/location`,
        payload,
        hasToken: Boolean(token),
      });

      const dummyRes = await fetch(
        `${API_BASE_URL}/api/dummy-vendors/${vendorId}/location`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const dummyData = await parseResponse(dummyRes, "dummy vendor API");

      console.log("Home location updated successfully across both APIs", {
        vendorId,
        nextPosition,
        vendorData,
        dummyData,
      });

      setPosition(nextPosition);
      setVendorInfo((prev) =>
        dummyData && typeof dummyData === "object"
          ? {
              ...prev,
              ...dummyData,
              location: {
                ...(prev?.location || {}),
                ...(dummyData?.location || {}),
                lat,
                lng,
                areaCity:
                  dummyData?.location?.areaCity ?? payload.areaCity,
                address: dummyData?.location?.address ?? payload.address,
              },
            }
          : prev
            ? {
                ...prev,
                location: {
                  ...(prev.location || {}),
                  lat,
                  lng,
                  areaCity: payload.areaCity,
                  address: payload.address,
                },
              }
            : prev
      );
      onSaved?.(nextPosition, {
        vendor: vendorData,
        dummyVendor: dummyData,
      });
      onClose?.();
    } catch (error) {
      console.error("Failed to save home location", error);
      alert(error.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card large">
        <h3>Set Home Location</h3>

        <HomeLocationMap
          position={safePosition}
          setPosition={handlePositionChange}
        />

        <p style={{ marginTop: 8 }}>
          <strong>Marker (live):</strong>{" "}
          {Number.isFinite(safePosition?.lat)
            ? safePosition.lat.toFixed(6)
            : DEFAULT_POSITION.lat.toFixed(6)}
          ,{" "}
          {Number.isFinite(safePosition?.lng)
            ? safePosition.lng.toFixed(6)
            : DEFAULT_POSITION.lng.toFixed(6)}
        </p>

        <div className="popup-actions">
          <button
            className="btn-outline"
            onClick={onClose}
            disabled={saving}
          >
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
