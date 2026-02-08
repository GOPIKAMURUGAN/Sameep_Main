"use client";

import { useState } from "react";

import Explore from "./Explore/page";
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


export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <div>
      {/* Loader overlay */}
      {loading && <Load />}

      {/* IMPORTANT:
          visibility:hidden keeps DOM in place
          so anchor scrolling still works */}
      <div style={{ visibility: loading ? "hidden" : "visible" }}>

        {/* HEADER */}
      <Header />
<Hero />
<Explore onReady={() => setLoading(false)} />
<Root />
<About />
<Contact />


<ScrollToTop />
        {/* GLOBAL PORTAL */}
        <Portal />
      </div>
    </div>
  );
}
