exports.suggestAreas = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat/lng required",
      });
    }

    const GOOGLE_KEY =
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_KEY) {
      console.warn("Missing GOOGLE_MAPS_API_KEY");
      return res.json({
        success: true,
        primaryLocality: "",
        city: "",
        suggestions: [],
      });
    }

    let primaryLocality = "";
    let city = "";
    let components = [];

    // ================================
    // 1️⃣ Reverse Geocode
    // ================================
    try {
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`
      );
      const geoData = await geoRes.json();

      components = geoData.results?.[0]?.address_components || [];

      primaryLocality =
        components.find((c) => c.types.includes("sublocality"))?.long_name ||
        components.find((c) => c.types.includes("locality"))?.long_name ||
        "";

      city =
        components.find((c) =>
          c.types.includes("administrative_area_level_2")
        )?.long_name ||
        components.find((c) => c.types.includes("locality"))?.long_name ||
        "";
    } catch (e) {
      console.warn("Reverse geocode failed");
    }

    // ================================
    // 2️⃣ Nearby Places (Neighborhood)
    // ================================
    let suggestions = [];
    try {
      const nearbyRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2500&type=neighborhood&key=${GOOGLE_KEY}`
      );
      const nearbyData = await nearbyRes.json();

      const names = (nearbyData.results || [])
        .map((p) => p.name)
        .filter(Boolean);

      const seen = new Set();
      suggestions = names
        .filter((name) => {
          const key = name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 6);
    } catch (e) {
      console.warn("Nearby search failed");
    }

    // ================================
    // 3️⃣ Geo Component Enrichment (🔥 NEW)
    // Adds fallback areas if few results
    // ================================
    if (suggestions.length < 3 && components.length) {
      const extra = components
        .filter(
          (c) =>
            c.types.includes("sublocality") ||
            c.types.includes("neighborhood") ||
            c.types.includes("sublocality_level_1")
        )
        .map((c) => c.long_name);

      const merged = [...suggestions, ...extra];

      const unique = [];
      const seen = new Set();

      for (const name of merged) {
        const key = name.toLowerCase();
        if (!seen.has(key) && name !== primaryLocality) {
          seen.add(key);
          unique.push(name);
        }
      }

      suggestions = unique.slice(0, 6);
    }

    // ================================
    // 4️⃣ Final Fallback
    // ================================
    if (!suggestions.length && primaryLocality) {
      suggestions = [primaryLocality];
    }

    // ================================
    // RESPONSE
    // ================================
    return res.json({
      success: true,
      primaryLocality,
      city,
      suggestions,
    });
  } catch (err) {
    console.error("Area suggestion error:", err);
    res.status(500).json({ success: false });
  }
};
