"use client";

import { Suspense } from "react";

import Explore from "./_Explore/Explore";
import Hero from "./Hero/Hero";
import Header from "./Header/Header";
import Root from "./Root/RootSection";
import About from "./About/About";
import Contact from "./Contact/Contact";
import Portal from "./Portal/Portal";
import ScrollToTop from "./components/ScrollToTop";
import { useVendor } from "@/app/context/VendorContext";

function PageContent() {
  const vendor = useVendor(); // SSR vendor

  console.log("SSR vendor in PageClient:", vendor);

  return (
    <div>
      <Header />
      <Hero />
      <Explore />
      <Root />
      <About />
      <Contact />
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
