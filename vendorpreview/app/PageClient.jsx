"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Explore from "./_Explore/Explore";
import Header from "./Header/Header";
import Root from "./Root/RootSection";
import About from "./About/About";
import Contact from "./Contact/Contact";
import Portal from "./Portal/Portal";
import ScrollToTop from "./components/ScrollToTop";
import { useVendor } from "@/app/context/VendorContext";
import { API_BASE_URL } from "../config";

function normalizePreviewTemplateKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["classic", "modern", "catalog", "astrology", "nurseries"].includes(normalized) ? normalized : "";
}

function PageContent() {
  const searchParams = useSearchParams();
  const { vendorInfo } = useVendor();
  const queryTemplate = searchParams.get("template");
  const [defaultTemplateKey, setDefaultTemplateKey] = useState("classic");
  const effectiveTemplateKey =
    normalizePreviewTemplateKey(queryTemplate) ||
    normalizePreviewTemplateKey(vendorInfo?.selectedTemplateKey) ||
    normalizePreviewTemplateKey(defaultTemplateKey) ||
    "classic";
  const isImmersiveTemplate = effectiveTemplateKey !== "classic";

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
    <div>
      {!isImmersiveTemplate ? <Header /> : null}
      <Explore />
      <Root />
      <About />
      {!isImmersiveTemplate ? <Contact /> : null}
      <ScrollToTop />
      <Portal />
    </div>
  );
}

export default function PageClient() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
