"use client";

import { useEffect, useState } from "react";
import "./Combo.css";

const API_URL =
  `api/${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-combos?parentCategoryId=691abce2531f54c7d983a30e`;

export default function ComboSection() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("Unexpected Combo API response:", data);
          setLoading(false);
          return;
        }

        const formatted = data.map((combo) => ({
          title: combo.name,
          price: combo.basePrice ? `₹${combo.basePrice}` : "₹0",
          img: combo.imageUrl || combo.iconUrl,
          desc:
            combo.includesNames?.length > 0
              ? `Includes: ${combo.includesNames.join(", ")}`
              : "",
        }));

        setCombos(formatted);
      } catch (error) {
        console.error("Combo API Error:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <section className="combo-section" id="combo">
      <h2 className="combo-title">Our Combos</h2>

      <div className="combo-container">
        {loading && <p className="loading">Loading combos…</p>}

        {!loading && combos.length === 0 && (
          <p className="loading">No combos available.</p>
        )}

        {combos.map((combo, index) => (
          <div className="combo-card" key={index}>
            <h3>{combo.title}</h3>

            <img src={combo.img} alt={combo.title} />

            <div className="prices">{combo.price}</div>

            <p className="desc">{combo.desc}</p>

            <button className="enroll-btn">Enroll Now</button>
          </div>
        ))}
      </div>
    </section>
  );
}
