"use client";
import { useEffect } from "react";
import "./About.css";
import { useVendor } from "@/app/context/VendorContext";
import {
  FaLeaf,
  FaUserTie,
  FaShieldAlt,
  FaClock,
  FaGift,
  FaGem,
} from "react-icons/fa";

const FALLBACK_ICONS = [
  <FaLeaf />,
  <FaUserTie />,
  <FaShieldAlt />,
  <FaClock />,
  <FaGift />,
  <FaGem />,
];

export default function AdvantageSection({ whyUs }) {
  const { vendorInfo } = useVendor() || {};

  const businessName = vendorInfo?.businessName || "Us";
const cards = (whyUs?.cards || []).filter(
  c => c.title?.trim() || c.description?.trim() || c.iconUrl?.trim()
);



  useEffect(() => {
    const elements = document.querySelectorAll(
      ".adv-card, .adv-title, .adv-subtitle"
    );

    const revealOnScroll = () => {
      elements.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight - 80;

        if (top < windowHeight) el.classList.add("reveal");
      });
    };

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll();
    return () => window.removeEventListener("scroll", revealOnScroll);
  }, []);

  if (!whyUs || !cards.length) return null;

  return (
    <section id="about"  className="adv-section">
      <h2 className="adv-title">
        {whyUs.heading || `Why Choose ${businessName}?`}
      </h2>

      {whyUs.subHeading && (
        <p className="adv-subtitle">{whyUs.subHeading}</p>
      )}

      <div className="adv-grid">
        {cards.map((item, index) => (
          <div className="adv-card" key={item._id}>
            <div className="adv-icon">
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt={item.title}
                  className="adv-icon-img"
                />
              ) : (
                FALLBACK_ICONS[index % FALLBACK_ICONS.length]
              )}
            </div>

            {item.title && <h3>{item.title}</h3>}
            {item.description && <p>{item.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
