"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { useVendor } from "@/app/context/VendorContext";
import "./ScrollToTop.css";

function sanitizeWhatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

function getWhatsappHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
  if (/^whatsapp:\/\//i.test(raw)) return raw;

  const sanitized = sanitizeWhatsappNumber(raw);
  return sanitized ? `https://wa.me/${sanitized}` : "";
}

export default function ScrollToTop() {
  const { vendorInfo } = useVendor() || {};
  const [visible, setVisible] = useState(false);
  const whatsappHref = getWhatsappHref(
    vendorInfo?.socialLinks?.whatsapp || vendorInfo?.phone || ""
  );

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible && !whatsappHref) return null;

  return (
    <div className="floating-action-stack">
      {whatsappHref ? (
        <a
          className="floating-whatsapp-btn"
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <FaWhatsapp />
        </a>
      ) : null}

      {visible ? (
        <button
          className="scroll-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}
