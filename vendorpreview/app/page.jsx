"use client";
import { useState, useEffect } from "react";

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


export default function Home() {
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionAllowed, setSessionAllowed] = useState(false);


useEffect(() => {
  let intervalId;

  const checkSession = async () => {
    const token = localStorage.getItem("authToken");

    // no session → allow public view
    if (!token) {
      setSessionAllowed(true);
      setCheckingSession(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/session-status-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      if (res.ok) {
        setSessionAllowed(true);
      } else {
        // ❌ invalid session
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        setSessionAllowed(false);
      }
    } catch {
      setSessionAllowed(false);
    } finally {
      setCheckingSession(false);
    }
  };

  // 🔁 1. Run immediately on load
  checkSession();

  // 🔁 2. Run every 10 seconds
  intervalId = setInterval(checkSession, 10_000);

  // 🔁 3. Run after login/logout
  const onStorage = () => {
    setCheckingSession(true);
    checkSession();
  };

  window.addEventListener("storage", onStorage);

  // 🧹 cleanup
  return () => {
    clearInterval(intervalId);
    window.removeEventListener("storage", onStorage);
  };
}, []);
if (checkingSession) {
  return <Load />; // reuse your loader
}

if (!sessionAllowed) {
  return null; // or show login modal / message
}

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