"use client";

import { useEffect } from "react";
import { useVendor } from "@/app/context/VendorContext";

const DEFAULT_FAVICON = "/favicon.svg";

function setLink(rel, href, type) {
  if (typeof document === "undefined") return;

  let link = document.querySelector(`link[rel='${rel}']`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
  if (type) {
    link.setAttribute("type", type);
  }
}

function setFavicon(href) {
  const iconHref = href || DEFAULT_FAVICON;
  setLink("icon", iconHref, "image/svg+xml");
  setLink("shortcut icon", iconHref, "image/svg+xml");
  setLink("apple-touch-icon", iconHref);
}

export default function VendorTitleUpdater() {
  const { vendorInfo } = useVendor() || {};

  useEffect(() => {
    const businessName =
      vendorInfo?.businessName ||
      vendorInfo?.vendor?.businessName ||
      "YNOT";
    document.title = businessName;

    const logoUrl =
      typeof vendorInfo?.logoUrl === "string" ? vendorInfo.logoUrl.trim() : "";
    setFavicon(logoUrl || DEFAULT_FAVICON);

    return () => {
      setFavicon(DEFAULT_FAVICON);
    };
  }, [vendorInfo]);

  return null;
}
