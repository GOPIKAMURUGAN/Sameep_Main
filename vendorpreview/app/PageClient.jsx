"use client";

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

export default function PageClient() {
  return (
    <Suspense fallback={<Load />}>
      <PageContent />
    </Suspense>
  );
}
