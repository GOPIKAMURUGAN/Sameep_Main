"use client";

import { FaLeaf, FaBullseye, FaEye } from "react-icons/fa";
import "./RootSection.css";

export default function RootsSection({ about }) {
  if (!about) return null;

  const hasContent =
    about.heading?.trim() ||
    about.mainText?.trim() ||
    about.mission?.trim() ||
    about.vision?.trim() ||
    about.card?.title?.trim() ||
    about.card?.description?.trim();

  // 🛑 DO NOT RENDER if API has nothing
  if (!hasContent) return null;

  return (
    <section id="why-us" className="roots-new">
      <div className="roots-inner">

        {/* LEFT */}
        <div className="roots-text">
          <h3 className="roots-tag">OUR STORY</h3>

          {about.heading && (
            <h2 className="roots-title">
              {about.heading}
            </h2>
          )}

          {about.mainText && (
            <p className="roots-para">
              {about.mainText}
            </p>
          )}

          {/* ICON STRIP */}
          <div className="roots-icons">
            <div><FaLeaf /></div>
            <div><FaBullseye /></div>
            <div><FaEye /></div>
          </div>

          {(about.mission || about.vision) && (
            <div className="roots-mv">
              {about.mission && (
                <div className="mv-item">
                  <h4>Our Mission</h4>
                  <p>{about.mission}</p>
                </div>
              )}

              {about.vision && (
                <div className="mv-item">
                  <h4>Our Vision</h4>
                  <p>{about.vision}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT CARD */}
        {about.card?.title || about.card?.description ? (
          <div className="roots-feature">
            <div className="feature-card">
              {about.card.title && <h2>{about.card.title}</h2>}
              {about.card.description && <p>{about.card.description}</p>}
              {about.card.buttonLabel && (
                <button>{about.card.buttonLabel}</button>
              )}
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
