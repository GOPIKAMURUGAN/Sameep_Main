"use client";

import "./Footer.css";
import { useEffect, useState } from "react";
import { FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";
import { useVendor } from "../VendorContext";
import { SOCIAL_ICONS } from "../Icons/SocialIcons";

const PAGE_SECTIONS = {
  Home: "home",
  Categories: "categories",
  "Why Us": "why-us",
  About: "about",
  Contact: "contact",
};

export default function Footer() {
  const { vendorInfo } = useVendor() || {};

  const popular = vendorInfo?.popularCategories || [];
  const socialLinks = vendorInfo?.socialLinks || {};
  const categoryId = vendorInfo?.categoryId;

  const [categoryData, setCategoryData] = useState(null);
  const [categorySocials, setCategorySocials] = useState([]);

  // ---------- HELPERS ----------
  const toAnchor = (label) =>
    label.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

  const normalize = (label) =>
    label.toLowerCase().replace(/\s+/g, "");

  // ==============================
  // ✅ LOAD CATEGORY DATA (MENU + SOCIALS)
  // ==============================
  useEffect(() => {
    if (!categoryId) return;

    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories/${categoryId}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data) => {
        setCategoryData(data);
        setCategorySocials(data.socialHandle || []);
      })
      .catch(() => {
        setCategoryData(null);
        setCategorySocials([]);
      });
  }, [categoryId]);

  const webMenu = categoryData?.webMenu || [];

  // ---------- FINAL SOCIALS ----------
  const socialsToRender = categorySocials
    .map((label) => {
      const key = normalize(label);
      const value = socialLinks[key];
      if (!value || !SOCIAL_ICONS[key]) return null;
      return { key, value };
    })
    .filter(Boolean);

  return (
    <footer className="footer">
      <div className="footer-container">

        {/* BRAND */}
        <div className="footer-col">
          <h3 className="footer-title">
            {vendorInfo?.businessName || "Business"}
          </h3>
          <p className="footer-text">
            Where beauty meets perfection. Experience luxury grooming and
            personalized care crafted to make you look and feel your absolute best.
          </p>
        </div>

        {/* ✅ QUICK LINKS (NOW WORKS EVERYWHERE) */}
        <div className="footer-col">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            {webMenu.map((item) => (
              <li key={item}>
                <a href={`#${PAGE_SECTIONS[item] || toAnchor(item)}`}>
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* POPULAR */}
        {popular.length > 0 && (
          <div className="footer-col">
            <h3 className="footer-title">Popular</h3>
            <ul className="footer-links">
              {popular.map((cat) => (
                <li key={cat.name}>
                  <a href={`#cat-${toAnchor(cat.name)}`}>{cat.name}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SOCIALS */}
        {socialsToRender.length > 0 && (
          <div className="footer-col">
            <h3 className="footer-title">Follow Us</h3>
            <div className="footer-socials">
              {socialsToRender.map(({ key, value }) => {
                const Icon = SOCIAL_ICONS[key];
                const href =
                  value.startsWith("http")
                    ? value
                    : key === "email"
                    ? `mailto:${value}`
                    : key === "whatsapp"
                    ? `https://wa.me/${value}`
                    : `https://${key}.com/${value}`;

                return (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer">
                    <Icon className={`social-icon ${key}`} />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTACT */}
        <div className="footer-col">
          <h3 className="footer-title">Reach Us</h3>

          {vendorInfo?.phone && (
            <p className="footer-info">
              <FaPhoneAlt className="footer-icon" />
              <a href={`tel:${vendorInfo.phone}`}>{vendorInfo.phone}</a>
            </p>
          )}

          {vendorInfo?.location?.address && (
            <p className="footer-info">
              <FaMapMarkerAlt className="footer-icon" />
              {vendorInfo.location.address}
            </p>
          )}
        </div>

      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} {vendorInfo?.businessName || "Business"} All Rights Reserved.
      </div>
    </footer>
  );
}
