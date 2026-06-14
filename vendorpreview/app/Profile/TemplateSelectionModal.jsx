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

const NURSERY_COLOR_SCHEMES = [
  {
    key: "forest",
    name: "Forest Green",
    preview: "linear-gradient(135deg, #214122 0%, #ef6a44 100%)",
  },
  {
    key: "terracotta",
    name: "Terracotta Clay",
    preview: "linear-gradient(135deg, #6d3b2b 0%, #e59e62 100%)",
  },
  {
    key: "midnight",
    name: "Midnight Garden",
    preview: "linear-gradient(135deg, #1a2744 0%, #7db1a7 100%)",
  },
  {
    key: "rosewood",
    name: "Rosewood Bloom",
    preview: "linear-gradient(135deg, #5d2f41 0%, #d6a37d 100%)",
  },
  {
    key: "olive",
    name: "Olive Grove",
    preview: "linear-gradient(135deg, #59633d 0%, #d9c489 100%)",
  },
  {
    key: "sage",
    name: "Sage Mist",
    preview: "linear-gradient(135deg, #93a691 0%, #f1eee4 100%)",
  },
  {
    key: "sunset",
    name: "Sunset Orchard",
    preview: "linear-gradient(135deg, #b85f34 0%, #f0b36f 100%)",
  },
  {
    key: "ivory",
    name: "Ivory Gold",
    preview: "linear-gradient(135deg, #f4ead2 0%, #b79a56 100%)",
  },
  {
    key: "onyx",
    name: "Black Onyx",
    preview: "linear-gradient(135deg, #171717 0%, #b89a57 100%)",
  },
  {
    key: "ruby",
    name: "Ruby Red",
    preview: "linear-gradient(135deg, #6b1f2f 0%, #d8b06b 100%)",
  },
  {
    key: "emerald",
    name: "Emerald Sand",
    preview: "linear-gradient(135deg, #136a5c 0%, #e5d6ad 100%)",
  },
  {
    key: "tealcopper",
    name: "Teal Copper",
    preview: "linear-gradient(135deg, #2b6f77 0%, #c48a5a 100%)",
  },
  {
    key: "mochasage",
    name: "Mocha Sage",
    preview: "linear-gradient(135deg, #6b4f3f 0%, #9aac8a 100%)",
  },
  {
    key: "chocolategold",
    name: "Chocolate Gold",
    preview: "linear-gradient(135deg, #4c3427 0%, #c9a96a 100%)",
  },
];

const MODERN_LIGHT_COLOR_SCHEMES = [
  {
    key: "ivory",
    name: "Ivory Gold",
    preview: "linear-gradient(135deg, #fbf8f2 0%, #d0ad4c 100%)",
  },
  {
    key: "champagne",
    name: "Champagne Beige",
    preview: "linear-gradient(135deg, #f8f1e7 0%, #c89e62 100%)",
  },
  {
    key: "rose",
    name: "Rose Ivory",
    preview: "linear-gradient(135deg, #fcf4f1 0%, #c88782 100%)",
  },
  {
    key: "sage",
    name: "Sage Linen",
    preview: "linear-gradient(135deg, #f5f3eb 0%, #8da289 100%)",
  },
];

export default function TemplateSelectionModal({
  vendorId,
  businessName,
  initialTemplateKey = "",
  initialNurseryColorScheme = "",
  initialModernColorScheme = "",
  onClose,
}) {
  const { setVendorInfo } = useVendor();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(initialTemplateKey || "");
  const [nurseryColorScheme, setNurseryColorScheme] = useState(
    initialNurseryColorScheme || "forest"
  );
  const [modernColorScheme, setModernColorScheme] = useState(
    initialModernColorScheme || "ivory"
  );
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

  const showNurseryColorScheme = selectedTemplateKey === "nurseries";
  const showModernColorScheme = selectedTemplateKey === "modern";

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
          nurseryColorScheme: nurseryColorScheme || "forest",
          modernColorScheme: modernColorScheme || "ivory",
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
              nurseryColorScheme: data?.nurseryColorScheme || nurseryColorScheme || "forest",
              modernColorScheme: data?.modernColorScheme || modernColorScheme || "ivory",
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

          {showNurseryColorScheme ? (
            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="nursery-color-scheme-select">
                Color Scheme
              </label>
              <select
                id="nursery-color-scheme-select"
                className="branding-text-input"
                value={nurseryColorScheme}
                onChange={(event) => setNurseryColorScheme(event.target.value)}
              >
                {NURSERY_COLOR_SCHEMES.map((scheme) => (
                  <option key={scheme.key} value={scheme.key}>
                    {scheme.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {NURSERY_COLOR_SCHEMES.map((scheme) => {
                  const active = nurseryColorScheme === scheme.key;
                  return (
                    <button
                      key={scheme.key}
                      type="button"
                      onClick={() => setNurseryColorScheme(scheme.key)}
                      style={{
                        alignItems: "center",
                        background: active ? "rgba(245, 217, 122, 0.08)" : "rgba(255,255,255,0.04)",
                        border: active
                          ? "1px solid rgba(245, 217, 122, 0.7)"
                          : "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#fffaf0",
                        cursor: "pointer",
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: "44px minmax(0, 1fr)",
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          background: scheme.preview,
                          borderRadius: 12,
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                          display: "block",
                          height: 44,
                          width: 44,
                        }}
                      />
                      <span style={{ fontWeight: 700 }}>{scheme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showModernColorScheme ? (
            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="modern-color-scheme-select">
                Color Scheme
              </label>
              <select
                id="modern-color-scheme-select"
                className="branding-text-input"
                value={modernColorScheme}
                onChange={(event) => setModernColorScheme(event.target.value)}
              >
                {MODERN_LIGHT_COLOR_SCHEMES.map((scheme) => (
                  <option key={scheme.key} value={scheme.key}>
                    {scheme.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {MODERN_LIGHT_COLOR_SCHEMES.map((scheme) => {
                  const active = modernColorScheme === scheme.key;
                  return (
                    <button
                      key={scheme.key}
                      type="button"
                      onClick={() => setModernColorScheme(scheme.key)}
                      style={{
                        alignItems: "center",
                        background: active ? "rgba(245, 217, 122, 0.08)" : "rgba(255,255,255,0.04)",
                        border: active
                          ? "1px solid rgba(245, 217, 122, 0.7)"
                          : "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        color: "#fffaf0",
                        cursor: "pointer",
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: "44px minmax(0, 1fr)",
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          background: scheme.preview,
                          borderRadius: 12,
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                          display: "block",
                          height: 44,
                          width: 44,
                        }}
                      />
                      <span style={{ fontWeight: 700 }}>{scheme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

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
