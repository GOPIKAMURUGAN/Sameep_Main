"use client";
import "./Business.css"
import { useState, useEffect } from "react";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function BusinessHoursModal({
  vendorId,
  businessName,
  initialHours = [],
  onClose,
}) {
  // ✅ Build state ONLY from API
  const [hours, setHours] = useState(() => {
    const map = {};
    initialHours.forEach((h) => {
      map[h.day] = h.hours;
    });

    return DAYS.map((day) => ({
      day,
      hours: map[day] || "", // ✅ NO STATIC TIME
    }));
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (index, value) => {
    const copy = [...hours];
    copy[index].hours = value;
    setHours(copy);
  };
useEffect(() => {
  if (!initialHours || initialHours.length === 0) return;

  const map = {};
  initialHours.forEach((h) => {
    map[h.day] = h.hours;
  });

  setHours(
    DAYS.map((day) => ({
      day,
      hours: map[day] || "",
    }))
  );
}, [initialHours]);

  const handleSave = async () => {
    try {
      if (!vendorId) return alert("Vendor ID missing");

      setSaving(true);
      const token = localStorage.getItem("token");

      // ✅ Send ONLY what user entered
      const payload = hours
        .filter((h) => h.hours.trim() !== "")
        .map((h) => ({
          day: h.day,
          hours: h.hours.trim(),
        }));

      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-vendors/${vendorId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            businessHours: payload,
          }),
        }
      );

      onClose();
    } catch (err) {
      console.error("Failed to save business hours", err);
      alert("Failed to save business hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card business-hours-theme">
        <h2 className="popup-title">Edit Business Hours</h2>
        <p className="popup-subtitle">{businessName}</p>

        <div className="hours-grid">
          {hours.map((item, i) => (
            <div key={item.day} className="hours-row">
              <span className="day-label">{item.day}</span>
              <input
  type="text"
  value={item.hours}
  onChange={(e) => handleChange(i, e.target.value)}
/>

            </div>
          ))}
        </div>

        <div className="popup-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-save primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
