"use client";

import { createContext, useContext, useEffect, useState } from "react";

const VendorContext = createContext(null);

export function VendorProvider({ vendor, children }) {
  const [vendorInfo, setVendorInfo] = useState(vendor || null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (vendor) {
      setVendorInfo(vendor);
      setReady(true);
      return;
    }

    setReady(true);
  }, [vendor]);

  return (
    <VendorContext.Provider
      value={{
        vendorInfo,
        setVendorInfo,
        ready,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export function useVendor() {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendor must be used inside VendorProvider");
  return ctx;
}

export default VendorProvider;
