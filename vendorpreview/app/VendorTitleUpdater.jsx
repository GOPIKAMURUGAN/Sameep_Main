"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function VendorTitleUpdater() {
  const searchParams = useSearchParams();
  const vendorName = searchParams.get("vendorName");

  useEffect(() => {
    if (vendorName) {
      document.title = decodeURIComponent(vendorName);
    }
  }, [vendorName]);

  return null;
}
