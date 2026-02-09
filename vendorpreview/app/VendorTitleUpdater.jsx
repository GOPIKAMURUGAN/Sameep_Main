"use client";

import { useEffect, use } from "react";
import { useSearchParams } from "next/navigation";

export default function VendorTitleUpdater() {
  // ⭐ Make useSearchParams Suspense-safe
  const searchParams = use(useSearchParams());

  const vendorName = searchParams.get("vendorName");

  useEffect(() => {
    if (vendorName) {
      document.title = decodeURIComponent(vendorName);
    }
  }, [vendorName]);

  return null;
}
