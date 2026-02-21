"use client";

import { createContext, useContext, useState, useMemo } from "react";

const VendorContext = createContext(null);

// ==============================
// SAFE NORMALIZATION LAYER
// ==============================
function enhanceVendor(raw) {
  if (!raw) return raw;

  const trustSummary = raw.trustSummary || {};

  return {
    ...raw,

    // --------------------------
    // BUSINESS NAME NORMALIZATION
    // --------------------------
    businessName:
      raw.businessName ||
      raw.vendorName ||
      raw.name,

    // --------------------------
    // TRUST BADGES (DYNAMIC)
    // Supports all categories
    // --------------------------
    trust: {
      years:
        trustSummary.experienceYears ||
        raw.yearsOfExperience ||
        raw.experience,

      customers:
        trustSummary.customers ||
        trustSummary.students ||
        trustSummary.petsGroomed ||
        raw.happyCustomers ||
        raw.customerCount,

      stylists: trustSummary.stylists
    },

    // --------------------------
    // GOOGLE RATING NORMALIZATION
    // --------------------------
    rating: {
      value:
        raw.googlePlace?.rating ||
        raw.googleRating ||
        raw.ratingValue,

      count:
        raw.googlePlace?.userRatingsTotal ||
        raw.ratingCount ||
        raw.reviewCount
    }
  };
}

// ==============================
// PROVIDER
// ==============================
export default function VendorProvider({ vendor, children }) {
  const [vendorInfo, setVendorInfo] = useState(
    enhanceVendor(vendor)
  );

  const value = useMemo(
    () => ({
      vendorInfo,
      setVendorInfo
    }),
    [vendorInfo]
  );

  return (
    <VendorContext.Provider value={value}>
      {children}
    </VendorContext.Provider>
  );
}

// ==============================
// HOOK
// ==============================
export function useVendor() {
  const ctx = useContext(VendorContext);
  if (!ctx) {
    throw new Error("useVendor must be used inside VendorProvider");
  }
  return ctx;
}
