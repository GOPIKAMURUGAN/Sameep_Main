"use client";

import "./Business.css";
import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { useVendor } from "@/app/context/VendorContext";

function normalizeText(value) {
  return String(value || "");
}

export default function HeroTextModal({
  vendorId,
  businessName,
  initialHeading = "",
  initialDescription = "",
  onClose,
}) {
  const { setVendorInfo } = useVendor();
  const [heading, setHeading] = useState(() => normalizeText(initialHeading));
  const [description, setDescription] = useState(() => normalizeText(initialDescription));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!vendorId) {
      alert("Vendor ID missing");
      return;
    }

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "";

    const payload = {
      freeText1: normalizeText(heading),
      freeText2: normalizeText(description),
    };

    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE_URL}/api/dummy-vendors/${vendorId}/custom-fields`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save hero text");
      }

      const nextCustomFields = {
        freeText1: payload.freeText1,
        freeText2: payload.freeText2,
        ...(data?.customFields || {}),
      };

      setVendorInfo((prev) =>
        prev
          ? {
              ...prev,
              customFields: {
                ...(prev.customFields || {}),
                ...nextCustomFields,
              },
            }
          : prev
      );

      onClose?.();
    } catch (error) {
      console.error("Failed to save hero text", error);
      alert(error.message || "Failed to save hero text");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card business-hours-theme branding-contact-theme">
        <h2 className="popup-title">Hero Text</h2>
        <p className="popup-subtitle">{businessName}</p>

        <div className="branding-contact-grid">
          <div className="branding-contact-section">
            <label className="branding-label" htmlFor="hero-heading">
              Heading
            </label>
            <input
              id="hero-heading"
              className="branding-text-input"
              type="text"
              placeholder="Enter hero heading"
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
            />
          </div>

          <div className="branding-contact-section">
            <label className="branding-label" htmlFor="hero-description">
              Description
            </label>
            <textarea
              id="hero-description"
              className="branding-textarea-input"
              placeholder="Enter hero description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
            />
          </div>
        </div>

        <div className="popup-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-save primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Text"}
          </button>
        </div>
      </div>
    </div>
  );
}
