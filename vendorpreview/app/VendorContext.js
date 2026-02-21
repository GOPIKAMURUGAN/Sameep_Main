"use client";

import { createContext, useContext, useState, useEffect } from "react";

const VendorContext = createContext(null);

export default function VendorProvider({ vendor, children }) {
  const [vendorInfo, setVendorInfo] = useState(vendor || null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Accept SSR vendor immediately
    if (vendor) {
      setVendorInfo(vendor);
      setReady(true);
      return;
    }

    // Prevent infinite spinner in dev root loads
    setReady(true);
  }, [vendor]);

  const value = {
    vendorInfo,
    setVendorInfo,
    ready
  };

  return (
    <VendorContext.Provider value={value}>
      {children}
    </VendorContext.Provider>
  );
}

export function useVendor() {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendor must be used inside VendorProvider");
  return ctx;
}
