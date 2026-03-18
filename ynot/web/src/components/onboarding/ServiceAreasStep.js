"use client";

import { useEffect, useMemo, useState } from "react";
import { suggestServiceAreas } from "../../services/onboardingApi";

export default function ServiceAreasStep({ vendor, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [primaryLocality, setPrimaryLocality] = useState("");
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [customArea, setCustomArea] = useState("");

  const { lat, lng } = useMemo(() => {
    if (!vendor) return { lat: null, lng: null };

    return {
      lat: vendor?.location?.lat || vendor?.lat || null,
      lng: vendor?.location?.lng || vendor?.lng || null,
    };
  }, [vendor]);

  useEffect(() => {
    if (!lat || !lng) return;

    let cancelled = false;

    async function loadAreas() {
      try {
        setLoading(true);
        const data = await suggestServiceAreas(lat, lng);
        if (cancelled) return;

        const suggested = Array.isArray(data?.suggestions)
          ? data.suggestions
          : [];

        const primary = data?.primaryLocality || "";
        setPrimaryLocality(primary);
        setCity(data?.city || "");
        setSuggestions(suggested);
        setSelectedAreas(
          suggested.length > 0 ? suggested : primary ? [primary] : []
        );
      } catch (error) {
        console.error("Area suggestion error", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAreas();

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((entry) => entry !== area) : [...prev, area]
    );
  };

  const addCustomArea = () => {
    const area = customArea.trim();
    if (!area) return;

    setSelectedAreas((prev) => (prev.includes(area) ? prev : [...prev, area]));
    setCustomArea("");
  };

  return (
    <section className="flow-card onboarding-wide">
      <p className="step-kicker">Service Areas</p>
      <h2 className="flow-title">Where do you want customers from?</h2>
      <p className="flow-copy">Select nearby areas or add your own.</p>

      {loading ? <p className="muted-copy">Loading suggestions...</p> : null}

      {(primaryLocality || city) && (
        <div className="location-header">
          {primaryLocality ? (
            <span className="primary-locality">{primaryLocality}</span>
          ) : null}
          {city ? <span className="city-name">{city}</span> : null}
        </div>
      )}

      {suggestions.length > 0 ? (
        <div className="suggestion-wrap">
          {suggestions.map((area) => (
            <button
              key={area}
              type="button"
              className={`suggestion-pill ${
                selectedAreas.includes(area) ? "active" : ""
              }`}
              onClick={() => toggleArea(area)}
            >
              {area}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-copy">Add areas manually if suggestions are unavailable.</p>
      )}

      <div className="custom-area-row">
        <input
          className="flow-input"
          type="text"
          placeholder="Add custom area"
          value={customArea}
          onChange={(event) => setCustomArea(event.target.value)}
        />
        <button type="button" className="secondaryButton" onClick={addCustomArea}>
          Add
        </button>
      </div>

      <div className="selected-areas">
        {selectedAreas.map((area) => (
          <button
            key={area}
            type="button"
            className="area-chip"
            onClick={() => toggleArea(area)}
          >
            {area} <span>×</span>
          </button>
        ))}
      </div>

      <div className="flow-actions">
        <button type="button" className="secondaryButton" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="ctaButton"
          onClick={() =>
            onNext?.({
              primaryLocality,
              city,
              targetAreas: selectedAreas,
              autoSuggested: true,
            })
          }
        >
          Continue
        </button>
      </div>
    </section>
  );
}
