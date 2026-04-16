"use client";

import "./Business.css";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import { useVendor } from "@/app/context/VendorContext";

function prettyTemplateLabel(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "System Default";
  return normalized
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TemplateSelectionModal({
  vendorId,
  businessName,
  initialTemplateKey = "",
  onClose,
}) {
  const { setVendorInfo } = useVendor();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(initialTemplateKey || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/preview-templates`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!cancelled) {
          setTemplates(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load templates", error);
        if (!cancelled) {
          setTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTemplates = useMemo(() => {
    return (templates || []).filter(
      (template) =>
        template?.status === "Active" || template?.key === String(initialTemplateKey || "").trim().toLowerCase()
    );
  }, [templates, initialTemplateKey]);

  const handleSave = async () => {
    if (!vendorId) {
      alert("Vendor ID missing");
      return;
    }

    try {
      setSaving(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        "";

      const response = await fetch(`${API_BASE_URL}/api/dummy-vendors/${vendorId}/template`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          selectedTemplateKey: selectedTemplateKey || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save template");
      }

      setVendorInfo((prev) =>
        prev
          ? {
              ...prev,
              selectedTemplateKey: data?.selectedTemplateKey || "",
            }
          : prev
      );

      onClose?.();
    } catch (error) {
      console.error("Failed to save vendor template", error);
      alert(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card business-hours-theme branding-contact-theme">
        <h2 className="popup-title">Website Template</h2>
        <p className="popup-subtitle">{businessName}</p>

        <div className="branding-contact-grid">
          <div className="branding-contact-section">
            <label className="branding-label" htmlFor="website-template-select">
              Default Template
            </label>
            {loading ? (
              <p className="popup-subtitle">Loading templates...</p>
            ) : (
              <select
                id="website-template-select"
                className="branding-text-input"
                value={selectedTemplateKey}
                onChange={(event) => setSelectedTemplateKey(event.target.value)}
              >
                <option value="">Use System Default</option>
                {visibleTemplates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name || prettyTemplateLabel(template.key)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="branding-contact-section">
            <label className="branding-label">Available Templates</label>
            <div style={{ display: "grid", gap: 10 }}>
              {visibleTemplates.map((template) => (
                <div
                  key={template.key}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border:
                      selectedTemplateKey === template.key
                        ? "1px solid rgba(245, 217, 122, 0.7)"
                        : "1px solid rgba(255,255,255,0.12)",
                    background:
                      selectedTemplateKey === template.key
                        ? "rgba(245, 217, 122, 0.08)"
                        : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ color: "#f8de91", fontWeight: 700 }}>
                    {template.name || prettyTemplateLabel(template.key)}
                  </div>
                  {template.description ? (
                    <div style={{ color: "rgba(255,250,236,0.78)", marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                      {template.description}
                    </div>
                  ) : null}
                  {template.previewHint ? (
                    <div style={{ color: "rgba(255,250,236,0.58)", marginTop: 6, fontSize: 12 }}>
                      {template.previewHint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="popup-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-save primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
