"use client";

import { useEffect } from "react";
import { useVendor } from "@/app/context/VendorContext";

export default function VendorTitleUpdater() {
  const vendor = useVendor();

  useEffect(() => {
    if (vendor?.businessName) {
      document.title = vendor.businessName;
    }
  }, [vendor]);

  return null;
}
