"use client";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";
import { useVendor } from "../context/VendorContext";
import "./Hero.css";

const HeroSection = ({
  images = [],
  googleRating,
  googleReviews,
  googleMapsUrl,
  trustSummary = {},
  trustCategoryId,
  tagline,
  description,
  button1Label,
  button2Label,
  onButton1Click,
  onButton2Click,
}) => {
  const { vendorInfo } = useVendor();
  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState(false);
  const [serviceModeLabel, setServiceModeLabel] = useState("Service Modes");
  const [trustQuestionLabels, setTrustQuestionLabels] = useState({});
  const classicThemeKey =
    String(vendorInfo?.classicColorScheme || "blackgold").trim().toLowerCase() || "blackgold";

  const prettifyLabel = (key) =>
    String(key || "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const trustEntries = Object.entries(trustSummary || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  const experienceEntry =
    trustEntries.find(([key]) => key === "experienceYears") ||
    trustEntries.find(([key]) => /experience/i.test(String(key)));

  const serviceModeEntry = trustEntries.find(
    ([key, value]) =>
      Array.isArray(value) &&
      /(service|mode|delivery|format|type)/i.test(String(key))
  );

  const serviceModes = Array.isArray(serviceModeEntry?.[1])
    ? serviceModeEntry[1].map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const serviceModeTrustKey = String(serviceModeEntry?.[0] || "").trim();
  const multiSelectEntries = trustEntries
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => ({
      key,
      label: trustQuestionLabels[key] || prettifyLabel(key),
      values: value.map((item) => String(item || "").trim()).filter(Boolean),
    }))
    .filter((entry) => entry.values.length > 0);
  const extraListEntries = multiSelectEntries.filter((entry) => entry.key !== serviceModeTrustKey);

  useEffect(() => {
    let cancelled = false;

    async function loadTrustQuestionMeta() {
      if (!trustCategoryId || multiSelectEntries.length === 0) {
        if (!cancelled) {
          setServiceModeLabel("Service Modes");
          setTrustQuestionLabels({});
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/trust/questions?categoryId=${encodeURIComponent(String(trustCategoryId))}`
        );
        const data = await response.json();
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        const labelMap = {};
        questions.forEach((question) => {
          const id = String(question?.id || "").trim();
          if (!id) return;
          labelMap[id] = String(question?.label || id);
        });

        if (!cancelled) {
          setTrustQuestionLabels(labelMap);
          setServiceModeLabel(
            String(
              (serviceModeTrustKey && labelMap[serviceModeTrustKey]) ||
              serviceModeTrustKey ||
              "Service Modes"
            )
          );
        }
      } catch (_) {
        if (!cancelled) {
          setTrustQuestionLabels({});
          setServiceModeLabel(String(serviceModeTrustKey || "Service Modes"));
        }
      }
    }

    loadTrustQuestionMeta();

    return () => {
      cancelled = true;
    };
  }, [multiSelectEntries.length, serviceModeTrustKey, trustCategoryId]);

  const formatStatValue = (value) => {
    if (value === null || value === undefined) return "";
    const normalized = String(value).trim();
    if (!normalized) return "";
    return normalized.endsWith("+") ? normalized : `${normalized}+`;
  };

  const statEntries = trustEntries.filter(([key, value]) => {
    if (key === experienceEntry?.[0]) return false;
    if (Array.isArray(value)) return false;
    return true;
  });

  const allImages = (Array.isArray(images) ? images : [])
    .map((image) => String(image || "").trim())
    .filter(Boolean);

  /* ================= AUTO SLIDER ================= */

  useEffect(() => {
    if (!allImages.length) return;

    const interval = setInterval(() => {
      setSlide(true);

      setTimeout(() => {
        setIndex((prev) => (prev + 1) % allImages.length);
        setSlide(false);
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [allImages]);

  /* ================= SAFETY ================= */

  const hasHeroImages = allImages.length > 0;
  const currentIndex = hasHeroImages ? index % allImages.length : 0;

  /* ================= GOOGLE MAP LINK ================= */

  const mapsLink = (() => {
    if (!googleMapsUrl) return "#";

    let placeId = "";

    if (googleMapsUrl.startsWith("place_id:")) {
      placeId = googleMapsUrl.replace("place_id:", "");
    } else if (googleMapsUrl.includes("place_id:")) {
      placeId = googleMapsUrl.split("place_id:")[1];
    }

    if (!placeId) return googleMapsUrl;

    const queryName = encodeURIComponent(tagline || "");

    return `https://www.google.com/maps/search/?api=1&query=${queryName}&query_place_id=${placeId}`;
  })();

  /* ================= UI ================= */

  return (
    <section
      id="home"
      className={`hero theme-${classicThemeKey} ${hasHeroImages ? "" : "hero-no-image"}`}
    >
      <div className="hero-left">
        <h1>{tagline}</h1>

        {description && <p className="hero-text">{description}</p>}

        <div className="stats">
          {experienceEntry?.[1] && (
            <div className="stat-item">
              <h2>{formatStatValue(experienceEntry[1])}</h2>
              <p>{experienceEntry[0] === "experienceYears" ? "Years Experience" : prettifyLabel(experienceEntry[0])}</p>
            </div>
          )}

          {statEntries.map(([key, value]) => {
            return (
              <div className="stat-item" key={key}>
                <h2>{formatStatValue(value)}</h2>
                <p>{prettifyLabel(key)}</p>
              </div>
            );
          })}

          {typeof googleRating === "number" && (
            <div className="stat-item">
              <a
                className="rating-clickable"
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h2>⭐ {googleRating}</h2>
                <p>
                  Google Rating
                  {googleReviews ? ` (${googleReviews})` : ""}
                </p>
              </a>
            </div>
          )}
        </div>

        {serviceModes.length > 0 && (
          <div className="hero-service-modes">
            <p className="hero-service-modes-label">{serviceModeLabel}</p>
            <div className="hero-service-mode-list">
              {serviceModes.map((mode) => (
                <span key={mode} className="hero-service-mode-chip">
                  <span className="hero-service-mode-chip-icon">✓</span>
                  {mode}
                </span>
              ))}
            </div>
          </div>
        )}

        {extraListEntries.map((entry) => (
          <div key={entry.key} className="hero-service-modes">
            <p className="hero-service-modes-label">{entry.label}</p>
            <div className="hero-service-mode-list">
              {entry.values.map((value) => (
                <span key={`${entry.key}-${value}`} className="hero-service-mode-chip">
                  <span className="hero-service-mode-chip-icon">✓</span>
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}

      </div>

      {/* RIGHT IMAGE SLIDER */}
      {hasHeroImages ? (
        <div className="hero-right">
          <img
            src={allImages[currentIndex]}
            alt="Hero Slide"
            className={`hero-img ${slide ? "slide-transition" : ""}`}
          />
        </div>
      ) : null}
    </section>
  );
};

export default HeroSection;
