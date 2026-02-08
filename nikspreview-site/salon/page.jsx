"use client";

import { useState, useEffect } from "react";

import Explore from "./Explore/page";
import Hero from "./Hero/Hero";
import Header from "./Header/Header";
import Combo from "./Combo/Combo";
import Root from "./Root/RootSection";
import About from "./About/About";
import Contact from "./Contact/Contact";
import Footer from "./Footer/Footer";
import Load from "./Load/Load";
import Portal from './Portal/Portal';
export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {loading ? (
        <Load />
      ) : (
        <>
          <Header />
          <Hero />
          <Combo />
          <Explore />
          <Root />
          <About />
          <Contact />
          <Footer />
         <Portal/>
        </>
      )}
    </div>
  );
}
