import { useEffect, useMemo, useState } from "react";

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
      <h2>Where do you want customers from?</h2>
      <p>Select nearby areas or add your own</p>

      {loading && <p>Loading suggestions...</p>}

      {/* Primary badge */}
      {(primaryLocality || city) && (
        <div style={{ marginBottom: 10 }}>
          {primaryLocality && (
            <span className="badge">{primaryLocality}</span>
          )}
          {city && <span style={{ marginLeft: 8 }}>{city}</span>}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length === 0 ? (
        <p>Add areas manually — suggestions unavailable</p>
      ) : (
        <div className="chip-wrap">
          {suggestions.map((area) => (
            <button
              key={area}
              className={`chip ${
                selectedAreas.includes(area) ? "active" : ""
              }`}
              onClick={() => toggleArea(area)}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {/* Manual entry */}
      <div className="input-row">
        <input
          type="text"
          placeholder="Add custom area"
          value={customArea}
          onChange={(e) => setCustomArea(e.target.value)}
        />
        <button onClick={addCustomArea}>Add</button>
      </div>

      {/* Selected areas */}
      <div className="chip-wrap">
        {selectedAreas.map((area) => (
          <span key={area} className="chip selected">
            {area}
            <button onClick={() => toggleArea(area)}>✕</button>
          </span>
        ))}
      </div>

      {/* Actions */}
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
