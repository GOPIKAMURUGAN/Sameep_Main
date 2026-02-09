"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import dynamicImport from "next/dynamic";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// ⭐ Dynamic imports (disable SSR)
const Header = dynamicImport(() => import("./Header/Header"), { ssr: false });
const Portal = dynamicImport(() => import("./Portal/Portal"), { ssr: false });
const Load = dynamicImport(() => import("./Load/Load"), { ssr: false });

// ⭐ Normal imports
import Explore from "./_Explore/Explore";
import Hero from "./Hero/Hero";
import Root from "./Root/RootSection";
import About from "./About/About";
import Contact from "./Contact/Contact";
import ScrollToTop from "./components/ScrollToTop";

/**
 * Converts labels → valid HTML ids
 */
const toAnchor = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");


// ⭐ Inner client component
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


// ⭐ Route wrapper
export default function Home() {
  return (
    <Suspense fallback={<Load />}>
      <PageContent />
    </Suspense>
  );
}
