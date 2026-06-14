"use client";

import "./Business.css";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { useVendor } from "@/app/context/VendorContext";

const MAX_HEADING = 120;
const MAX_SUBHEADING = 220;
const MAX_CARD_TITLE = 60;
const MAX_CARD_DESCRIPTION = 180;

function normalizeText(value) {
  return String(value || "");
}

function normalizeWhyUs(input) {
  const source = input && typeof input === "object" ? input : {};
  const cards = Array.isArray(source.cards) ? source.cards : [];

  return {
    heading: String(source.heading || "").slice(0, MAX_HEADING),
    subHeading: String(source.subHeading || "").slice(0, MAX_SUBHEADING),
    cards: Array.from({ length: 4 }, (_, index) => ({
      title: String(cards[index]?.title || "").slice(0, MAX_CARD_TITLE),
      description: String(cards[index]?.description || "").slice(0, MAX_CARD_DESCRIPTION),
    })),
  };
}

export default function WhyUsModal({
  vendorId,
  businessName,
  categoryId = "",
  initialHeading = "",
  initialSubHeading = "",
  initialCards = [],
  onClose,
}) {
  const { setVendorInfo } = useVendor();
  const [whyUs, setWhyUs] = useState(() =>
    normalizeWhyUs({
      heading: initialHeading,
      subHeading: initialSubHeading,
      cards: initialCards,
    })
  );
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hasExistingOverride =
      String(initialHeading || "").trim() ||
      String(initialSubHeading || "").trim() ||
      (Array.isArray(initialCards) ? initialCards.some((card) => card?.title || card?.description) : false);

    if (!categoryId || hasExistingOverride) return;

    let active = true;
    async function loadCategoryDefaults() {
      try {
        setLoadingDefaults(true);
        const response = await fetch(`${API_BASE_URL}/api/dummy-categories/${categoryId}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !active) return;

        const categoryWhyUs = data?.whyUs && typeof data.whyUs === "object" ? data.whyUs : {};
        const normalized = normalizeWhyUs(categoryWhyUs);
        const hasDefaults =
          normalized.heading.trim() ||
          normalized.subHeading.trim() ||
          normalized.cards.some((card) => card.title.trim() || card.description.trim());

        if (hasDefaults) {
          setWhyUs(normalized);
        }
      } catch (error) {
        console.error("Failed to load category why us defaults", error);
      } finally {
        if (active) setLoadingDefaults(false);
      }
    }

    loadCategoryDefaults();
    return () => {
      active = false;
    };
  }, [categoryId, initialCards, initialHeading, initialSubHeading]);

  const updateField = (field, value, maxLength) => {
    setWhyUs((prev) => ({
      ...prev,
      [field]: String(value || "").slice(0, maxLength),
    }));
  };

  const updateCardField = (index, field, value, maxLength) => {
    setWhyUs((prev) => ({
      ...prev,
      cards: prev.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [field]: String(value || "").slice(0, maxLength) } : card
      ),
    }));
  };

  const handleSave = async () => {
    if (!vendorId) {
      alert("Vendor ID missing");
      return;
    }

    const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
    const payload = {
      whyUs: {
        heading: normalizeText(whyUs.heading).trim().slice(0, MAX_HEADING),
        subHeading: normalizeText(whyUs.subHeading).trim().slice(0, MAX_SUBHEADING),
        cards: whyUs.cards.map((card) => ({
          title: normalizeText(card.title).trim().slice(0, MAX_CARD_TITLE),
          description: normalizeText(card.description).trim().slice(0, MAX_CARD_DESCRIPTION),
        })),
      },
    };

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/dummy-vendors/${vendorId}/custom-fields`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save Why Us");
      }

      const vendorRefreshResponse = await fetch(`${API_BASE_URL}/api/dummy-vendors/${vendorId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      const refreshedVendor = await vendorRefreshResponse.json().catch(() => null);

      setVendorInfo((prev) =>
        prev
          ? {
              ...prev,
              ...(refreshedVendor && typeof refreshedVendor === "object" ? refreshedVendor : {}),
              customFields: {
                ...(prev.customFields || {}),
                ...(refreshedVendor?.customFields || {}),
                ...(data?.customFields || {}),
              },
            }
          : prev
      );

      onClose?.();
    } catch (error) {
      console.error("Failed to save Why Us", error);
      alert(error.message || "Failed to save Why Us");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card business-hours-theme branding-contact-theme">
        <h2 className="popup-title">Why Us</h2>
        <p className="popup-subtitle">{businessName}</p>

        <div className="branding-contact-body">
          <div className="branding-contact-grid">
            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="why-us-heading">
                Heading
              </label>
              <input
                id="why-us-heading"
                className="branding-text-input"
                type="text"
                maxLength={MAX_HEADING}
                placeholder="Enter section heading"
                value={whyUs.heading}
                onChange={(event) => updateField("heading", event.target.value, MAX_HEADING)}
              />
              <div className="branding-helper-text">{whyUs.heading.trim().length}/{MAX_HEADING} characters</div>
            </div>

            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="why-us-subheading">
                Sub Heading
              </label>
              <textarea
                id="why-us-subheading"
                className="branding-textarea-input"
                maxLength={MAX_SUBHEADING}
                placeholder="Enter section description"
                value={whyUs.subHeading}
                onChange={(event) => updateField("subHeading", event.target.value, MAX_SUBHEADING)}
                rows={4}
              />
              <div className="branding-helper-text">{whyUs.subHeading.trim().length}/{MAX_SUBHEADING} characters</div>
            </div>

            <div className="branding-contact-section">
              <label className="branding-label">Why Us Cards</label>
              <div className="branding-helper-text">
                Common profile field. Modern Light preview shows this section right now. Up to 4 cards with short title and description.
              </div>
              {loadingDefaults ? <div className="branding-helper-text">Loading category defaults...</div> : null}
              <div className="branding-why-us-grid">
                {whyUs.cards.map((card, index) => (
                  <div key={`why-us-card-${index}`} className="branding-contact-section nested">
                    <label className="branding-sub-label" htmlFor={`why-us-card-title-${index}`}>
                      Card {index + 1} Title
                    </label>
                    <input
                      id={`why-us-card-title-${index}`}
                      className="branding-text-input"
                      type="text"
                      maxLength={MAX_CARD_TITLE}
                      placeholder={`Enter card ${index + 1} title`}
                      value={card.title}
                      onChange={(event) =>
                        updateCardField(index, "title", event.target.value, MAX_CARD_TITLE)
                      }
                    />
                    <div className="branding-helper-text">{card.title.trim().length}/{MAX_CARD_TITLE} characters</div>

                    <label className="branding-sub-label" htmlFor={`why-us-card-description-${index}`}>
                      Card {index + 1} Description
                    </label>
                    <textarea
                      id={`why-us-card-description-${index}`}
                      className="branding-textarea-input"
                      maxLength={MAX_CARD_DESCRIPTION}
                      placeholder={`Enter card ${index + 1} description`}
                      value={card.description}
                      onChange={(event) =>
                        updateCardField(index, "description", event.target.value, MAX_CARD_DESCRIPTION)
                      }
                      rows={3}
                    />
                    <div className="branding-helper-text">
                      {card.description.trim().length}/{MAX_CARD_DESCRIPTION} characters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="popup-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-save primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Why Us"}
          </button>
        </div>
      </div>
    </div>
  );
}
