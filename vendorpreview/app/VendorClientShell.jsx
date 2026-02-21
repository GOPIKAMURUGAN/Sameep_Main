"use client";

import VendorProvider from "./VendorContext";
import VendorTitleUpdater from "./VendorTitleUpdater";

export default function VendorClientShell({ vendor, children }) {
  return (
    <VendorProvider vendor={vendor}>
      <VendorTitleUpdater />
      {children}
    </VendorProvider>
  );
}
