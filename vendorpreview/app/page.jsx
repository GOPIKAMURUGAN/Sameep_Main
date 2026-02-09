"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import Explore from "./_Explore/Explore";
import Hero from "./Hero/Hero";
import Header from "./Header/Header";
import Root from "./Root/RootSection";
import About from "./About/About";
import Contact from "./Contact/Contact";
import Load from "./Load/Load";
import Portal from "./Portal/Portal";
import ScrollToTop from "./components/ScrollToTop";

/**
 * Converts labels → valid HTML ids
 * MUST match Header/Footer anchor logic
 */
const toAnchor = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");


// ⭐ Inner client component (uses useSearchParams)
function PageContent() {
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();

  const vendorId = searchParams.get("vendorId");
  const rootCategoryId = searchParams.get("rootCategoryId");
  const vendorName = searchParams.get("vendorName");

  console.log("Preview params:", {
    vendorId,
    rootCategoryId,
    vendorName,
  });

  return (
    <div>
      {loading && <Load />}

      <div style={{ visibility: loading ? "hidden" : "visible" }}>
        <Header />
        <Hero />
        <Explore onReady={() => setLoading(false)} />
        <Root />
        <About />
        <Contact />
        <ScrollToTop />
        <Portal />
      </div>
    </div>
  );
}


// ⭐ Route wrapper (required Suspense boundary for NextJS 16)
export default function Home() {
  return (
    <Suspense fallback={<Load />}>
      <PageContent />
    </Suspense>
  );
}
