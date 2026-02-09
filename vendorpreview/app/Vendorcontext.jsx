"use client";

import { createContext, useContext, useState } from "react";

const VendorContext = createContext(null);

// ✅ PROVIDER
export function VendorProvider({ children }) {
  const [vendorInfo, setVendorInfo] = useState(null);

  return (
    <VendorContext.Provider value={{ vendorInfo, setVendorInfo }}>
      {children}
    </VendorContext.Provider>
  );
}

// ✅ HOOK (THIS WAS MISSING / BROKEN)
export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error("useVendor must be used inside VendorProvider");
  }
  return context;
}
