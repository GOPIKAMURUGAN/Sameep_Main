"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Footer from "./Footer/Footer";
import VendorTitleUpdater from "./VendorTitleUpdater";
import { useVendor } from "./context/VendorContext";
import { API_BASE_URL } from "../config";

function shouldHideFooter(pathname) {
  return pathname.startsWith("/b/") || pathname.startsWith("/bill/");
}

function normalizePreviewTemplateKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["classic", "modern", "catalog", "astrology", "nurseries", "ecommerce"].includes(normalized) ? normalized : "";
}

export default function AppChrome({ children }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { vendorInfo } = useVendor();
  const queryTemplate = searchParams.get("template");
  const [defaultTemplateKey, setDefaultTemplateKey] = useState("classic");
  const effectiveTemplateKey =
    normalizePreviewTemplateKey(queryTemplate) ||
    normalizePreviewTemplateKey(vendorInfo?.selectedTemplateKey) ||
    normalizePreviewTemplateKey(defaultTemplateKey) ||
    "classic";
  const hideFooter =
    shouldHideFooter(pathname) || effectiveTemplateKey !== "classic";

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultTemplate() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/preview-templates/default`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!cancelled) {
          setDefaultTemplateKey(normalizePreviewTemplateKey(data?.key) || "classic");
        }
      } catch {
        if (!cancelled) {
          setDefaultTemplateKey("classic");
        }
      }
    }

    loadDefaultTemplate();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <VendorTitleUpdater />
      {children}
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
