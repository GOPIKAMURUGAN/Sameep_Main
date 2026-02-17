"use client";

import { useState, useEffect } from "react";
import "./Hero.css";

const HeroSection = ({
  images = [],
  googleRating,
  googleReviews,
  googleMapsUrl,
trustSummary = {},

  // ✅ FROM CATEGORY API
  tagline,
  description,
  button1Label,
  button2Label,
}) => {

  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState(false);
  const experience = trustSummary?.experienceYears;

  const getStatLabel = (key) => {
    const map = {
      stylists: "Expert Stylists",
      students_trained: "Students Trained",
      vehicles_serviced: "Vehicles Serviced",
      customers: "Happy Customers",
    };
    return map[key] || key;
  };


  // reset index if images change
  useEffect(() => {
    setIndex(0);
  }, [images]);

  // Slide every 4 seconds
  useEffect(() => {
    if (!images.length) return;

    const interval = setInterval(() => {
      setSlide(true);

      setTimeout(() => {
        setIndex((prev) => (prev + 1) % images.length);
        setSlide(false);
      }, 800); // animation duration
    }, 4000);

    return () => clearInterval(interval);
  }, [images]);

  // 🛑 safety guard
  if (!images.length) return null;

  return (
    <section id="home" className="hero">
      <div className="hero-left">
        <h1>
          {tagline}
          <br />
        </h1>

        {description && (
          <p className="hero-text">
            {description}
          </p>
        )}

          <div className="stats">
          {experience && (
            <div className="stat-item">
              <h2>{experience}+</h2>
              <p>Years Experience</p>
            </div>
          )}
            {Object.entries(trustSummary || {}).map(([key, value]) => {
            if (key === "experienceYears") return null;
            if (value === null || value === undefined || value === "") return null;

            return (
              <div className="stat-item" key={key}>
                <h2>{value}+</h2>
                <p>{getStatLabel(key)}</p>
              </div>
            );
          })}

       
          <div className="stat-item">
            {typeof googleRating === "number" ? (
              <a
  className="rating-clickable"
  href={googleMapsUrl || "#"}
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
            ) : (
              <>
                <h2>Top-Rated</h2>
                <p>Quality Service</p>
              </>
            )}
          </div>


        </div>

        <div className="hero-buttons">
          {button1Label && (
            <button className="btn">
              {button1Label}
            </button>
          )}

          {button2Label && (
            <button className="btn">
              {button2Label}
            </button>
          )}
        </div>

      </div>

      {/* RIGHT SLIDER */}
      <div className="hero-right">
        <img
          src={images[index]}
          alt="Hero Slide"
          className={`hero-img ${slide ? "slide-transition" : ""}`}
        />
      </div>
    </section>
  );
};

export default HeroSection;

