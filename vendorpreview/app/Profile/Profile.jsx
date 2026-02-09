"use client";

import "./Profile.css";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import HomeLocationModal from "./HomeLocationModal";
import BusinessLocationsModal from "./BusinessLocationsModal";
import BusinessHoursModal from "./BusinessHoursModal";
import { SOCIAL_ICONS } from "../Icons/SocialIcons";

export default function ProfileModal({ onClose, onOpenServices }) {
  /* ================= URL PARAMS ================= */
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const rootCategoryId = searchParams.get("rootCategoryId");
  const vendorName = searchParams.get("vendorName");

  /* ================= STATE ================= */
  const [opening, setOpening] = useState(false);

  const [showHomeLocation, setShowHomeLocation] = useState(false);
  const [showBusinessLocations, setShowBusinessLocations] = useState(false);
  const [showBusinessHours, setShowBusinessHours] = useState(false);

  const [vendor, setVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);

  const [showSocialPopup, setShowSocialPopup] = useState(false);
  const [socialType, setSocialType] = useState("");
  const [socialValue, setSocialValue] = useState("");
  const [saving, setSaving] = useState(false);

  // null = category not loaded yet
  const [categorySocials, setCategorySocials] = useState(null);

  /* ================= USER (LOCAL STORAGE) ================= */
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userData") || "{}")
      : {};

  const socialLinks = user?.socialLinks || {};

  /* ================= HELPERS ================= */
  const normalize = (label) =>
    label.toLowerCase().replace(/\s+/g, "");

  /* ================= FETCH CATEGORY SOCIALS ================= */
useEffect(() => {
  if (!vendorId) return;

  // 🔥 Clear old vendor cache
  localStorage.removeItem("userData");
}, [vendorId]);



  useEffect(() => {
    if (!rootCategoryId) return;

    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories/${rootCategoryId}`
    )
      .then((res) => res.json())
      .then((data) => {
        setCategorySocials(data.socialHandle || []);
      })
      .catch((err) => {
        console.error("Failed to load category socials", err);
        setCategorySocials([]);
      });
  }, [rootCategoryId]);

  /* ================= BUILD SOCIALS FROM CATEGORY ================= */
  const socialsToRender =
    categorySocials === null
      ? []
      : categorySocials
          .map((label) => {
            const key = normalize(label);
            if (!SOCIAL_ICONS[key]) return null;

            return {
              key,
              label,
              value: socialLinks[key] || "",
            };
          })
          .filter(Boolean);

  /* ================= BUSINESS HOURS ================= */
  const openBusinessHours = async () => {
    try {
      setLoadingVendor(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-vendors/${vendorId}`
      );
      const data = await res.json();
      setVendor(data);
      setShowBusinessHours(true);
    } catch (err) {
      console.error("Failed to load vendor", err);
      alert("Failed to load business hours");
    } finally {
      setLoadingVendor(false);
    }
  };

  /* ================= SAVE SOCIAL ================= */
  const handleSaveSocial = async () => {
    try {
      if (!vendorId) return;

      setSaving(true);
      const token = localStorage.getItem("token");

      const updatedSocials = {
        ...socialLinks,
        [socialType]: socialValue,
      };

      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-vendors/${vendorId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ socialLinks: updatedSocials }),
        }
      );

      localStorage.setItem(
        "userData",
        JSON.stringify({
          ...user,
          socialLinks: updatedSocials,
        })
      );

      setShowSocialPopup(false);
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="profile-overlay">
      <div className="profile-card">
        <h2 className="profile-name">{vendorName || user.name || "User"}</h2>
        <p className="profile-phone">📞 {user.phone || "-"}</p>

        <button className="profile-btn">📩 My Enquiries</button>

        <hr />

        <h4 className="section-title">MY PRICES</h4>

        <div
          className="profile-row clickable"
          onClick={() => {
            if (opening) return;
            setOpening(true);
            onOpenServices("packages");
          }}
        >
          <span>My Services</span>
          {opening ? <span className="row-loader" /> : <span className="active-badge">ACTIVE</span>}
        </div>

        <hr />

        {/* ================= SOCIAL HANDLES ================= */}
        <h4 className="section-title">MY SOCIAL HANDLES</h4>

        {categorySocials === null && (
          <p className="profile-link" style={{ opacity: 0.6 }}>
            Loading social options…
          </p>
        )}

        {categorySocials !== null && socialsToRender.length === 0 && (
          <p className="profile-link" style={{ opacity: 0.6 }}>
            No social platforms configured for this category
          </p>
        )}

        {socialsToRender.map(({ key, label, value }) => {
          const Icon = SOCIAL_ICONS[key];
          const hasValue = Boolean(value);

          return (
            <p
              key={key}
              className={`profile-link social clickable ${
                !hasValue ? "empty-social" : ""
              }`}
              onClick={() => {
                setSocialType(key);
                setSocialValue(value);
                setShowSocialPopup(true);
              }}
            >
              <Icon className={`social-icon ${key}`} />
              {label}
              {!hasValue && (
                <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 13 }}>
                  (Add)
                </span>
              )}
            </p>
          );
        })}

        <hr />

        {/* ================= LOCATIONS & HOURS ================= */}
        <h4 className="section-title">LOCATIONS & HOURS</h4>

        <p className="profile-link clickable" onClick={() => setShowHomeLocation(true)}>
          🏠 Home Location
        </p>

        <p className="profile-link clickable" onClick={() => setShowBusinessLocations(true)}>
          📍 Business Locations (Nearby)
        </p>

        {showBusinessLocations && (
          <BusinessLocationsModal
            vendorId={vendorId}
            initialLocations={user?.nearbyLocations || []}
            onClose={() => setShowBusinessLocations(false)}
          />
        )}

        <p className="profile-link clickable" onClick={openBusinessHours}>
          ⏰ Business Hours
        </p>

        {showBusinessHours && vendor && (
          <BusinessHoursModal
            vendorId={vendorId}
            businessName={vendor.businessName}
            initialHours={vendor.businessHours}
            onClose={() => setShowBusinessHours(false)}
          />
        )}

        <button className="close-profile" onClick={onClose}>
          Close
        </button>
      </div>

      {showHomeLocation && (
        <HomeLocationModal
          vendorId={vendorId}
          onClose={() => setShowHomeLocation(false)}
        />
      )}

      {/* ================= SOCIAL POPUP ================= */}
      {showSocialPopup && (
        <div className="popup-overlay">
          <div className="popup-card">
            <h3>Edit {socialType.charAt(0).toUpperCase() + socialType.slice(1)}</h3>

            <input
              type="text"
              value={socialValue}
              onChange={(e) => setSocialValue(e.target.value)}
              placeholder="Enter link / handle"
            />

            <div className="popup-actions">
              <button className="btn-outline" onClick={() => setShowSocialPopup(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveSocial} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
