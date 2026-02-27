import { useEffect, useMemo, useState } from "react";
import "./serviceAreaStep.css";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

function ServiceAreasStep({ vendor, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [primaryLocality, setPrimaryLocality] = useState("");
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [customArea, setCustomArea] = useState("");

  // ✅ Resolve lat/lng safely (supports both shapes)
  const { lat, lng } = useMemo(() => {
    if (!vendor) return { lat: null, lng: null };

    return {
      lat: vendor?.location?.lat || vendor?.lat || null,
      lng: vendor?.location?.lng || vendor?.lng || null,
    };
  }, [vendor]);

  useEffect(() => {
    if (!lat || !lng) {
      console.warn("Missing vendor lat/lng", { lat, lng, vendor });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE_URL}/api/location/suggest-areas?lat=${lat}&lng=${lng}`
        );

        const data = await res.json();
        if (cancelled) return;

        const suggested = Array.isArray(data?.suggestions)
          ? data.suggestions
          : [];

        const primary = data?.primaryLocality || "";

        setPrimaryLocality(primary);
        setCity(data?.city || "");
        setSuggestions(suggested);

        // ✅ Auto-select logic
        setSelectedAreas(
          suggested.length > 0 ? suggested : primary ? [primary] : []
        );
      } catch (err) {
        console.error("Area suggestion error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [lat, lng]); // ✅ FIXED DEPENDENCY (prevents API spam)

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const addCustomArea = () => {
    const area = customArea.trim();
    if (!area) return;

    setSelectedAreas((prev) =>
      prev.includes(area) ? prev : [...prev, area]
    );
    setCustomArea("");
  };

  const handleSubmit = () => {
    const payload = {
      primaryLocality,
      city,
      targetAreas: selectedAreas,
      autoSuggested: true,
    };

    onNext?.(payload);
  };

 return (
  <div className="trust-card">
    <h2 className="service-title">Where do you want customers from?</h2>
    <p className="service-subtitle">
      Select nearby areas or add your own
    </p>

    {loading && <p>Loading suggestions...</p>}

    {/* 🔥 Location header */}
    {(primaryLocality || city) && (
      <div className="location-header">
        {primaryLocality && (
          <span className="primary-locality">{primaryLocality}</span>
        )}
        {city && <span className="city-name">{city}</span>}
      </div>
    )}

    {/* 🔥 Suggestions */}
    {suggestions.length === 0 ? (
      <p>Add areas manually — suggestions unavailable</p>
    ) : (
      <div className="suggestion-wrap">
        {suggestions.map((area) => (
          <button
            key={area}
            className={`suggestion-pill ${
              selectedAreas.includes(area) ? "active" : ""
            }`}
            onClick={() => toggleArea(area)}
          >
            {area}
          </button>
        ))}
      </div>
    )}

    {/* 🔥 Custom area input */}
    <div className="custom-area-row">
      <input
        className="custom-area-input"
        type="text"
        placeholder="Add custom area"
        value={customArea}
        onChange={(e) => setCustomArea(e.target.value)}
      />
      <button className="add-area-btn" onClick={addCustomArea}>
        Add
      </button>
    </div>

    {/* 🔥 Selected areas */}
    <div className="selected-areas">
      {selectedAreas.map((area) => (
        <div key={area} className="area-chip">
          {area}
          <span onClick={() => toggleArea(area)}>✕</span>
        </div>
      ))}
    </div>

    {/* 🔥 Actions */}
    <div className="trust-actions">
      <button className="btn secondary" onClick={onBack}>
        Back
      </button>
      <button className="btn primary" onClick={handleSubmit}>
        Continue
      </button>
    </div>
  </div>
);
}

export default ServiceAreasStep;