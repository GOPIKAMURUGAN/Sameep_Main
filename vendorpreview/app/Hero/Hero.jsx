"use client";

import { useState, useEffect } from "react";
import "./Hero.css";

const HeroSection = ({
  images = [],
  googleRating,
  googleReviews,
  googleMapsUrl,

  // ✅ FROM CATEGORY API
  tagline,
  description,
  button1Label,
  button2Label,
}) => {

  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState(false);

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
          <div className="stat-item">
            <h2>15+</h2>
            <p>Years Experience</p>
          </div>

          <div className="stat-item">
            <h2>1k+</h2>
            <p>Happy Customers</p>
          </div>

          <div className="stat-item">
            {typeof googleRating === "number" ? (
              <div
                className="rating-clickable"
                onClick={() => {
                  if (googleMapsUrl) {
                    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <h2>⭐ {googleRating}</h2>
                <p>
                  Google Rating
                  {googleReviews ? ` (${googleReviews})` : ""}
                </p>
              </div>
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
            <button className="btn-primary">
              {button1Label}
            </button>
          )}

          {button2Label && (
            <button className="btn-outline">
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
