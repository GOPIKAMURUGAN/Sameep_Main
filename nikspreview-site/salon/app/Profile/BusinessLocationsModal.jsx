"use client";

import { useState } from "react";

export default function BusinessLocationsModal({
  vendorId,
  initialLocations = [],
  onClose,
}) {
  const [locations, setLocations] = useState(
    [...initialLocations, "", "", "", "", ""].slice(0, 5)
  );

  const [savingIndex, setSavingIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const saveToBackend = async (updatedLocations, index) => {
    try {
      if (!vendorId) return alert("Vendor ID missing");

      const cleaned = updatedLocations.map(v => v.trim());

      setSavingIndex(index);
      const token = localStorage.getItem("token");

      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-vendors/${vendorId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            location: {
              nearbyLocations: cleaned,
            },
          }),
        }
      );
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    } finally {
      setSavingIndex(null);
    }
  };

  const handleChange = (i, val) => {
    const copy = [...locations];
    copy[i] = val;
    setLocations(copy);
  };

  const handleSave = async (i) => {
    if (!locations[i].trim()) return;
    await saveToBackend(locations, i);
    setEditingIndex(null);
  };

  const handleDelete = async (i) => {
    const copy = [...locations];
    copy[i] = "";
    setLocations(copy);
    await saveToBackend(copy, i);
    setEditingIndex(null);
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card nearby-theme">
        <h2 className="popup-title">Business Locations (Nearby)</h2>

        {locations.map((loc, i) => {
          const isEditing = editingIndex === i;
          const hasValue = loc.trim();

          return (
            <div key={i} className="nearby-row">
              <input
                className={`nearby-input ${isEditing ? "editing" : ""}`}
                placeholder={`Nearby location ${i + 1}`}
                value={loc}
                onFocus={() => setEditingIndex(i)}
                onChange={(e) => handleChange(i, e.target.value)}
              />

              <button
                className="nearby-save"
                disabled={savingIndex === i || !hasValue}
                onClick={() => handleSave(i)}
              >
                {savingIndex === i ? "Saving..." : "Save"}
              </button>

              {isEditing && hasValue && (
                <button
                  className="nearby-delete"
                  disabled={savingIndex === i}
                  onClick={() => handleDelete(i)}
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}

        <button className="close-btn soft" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
