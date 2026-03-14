"use client";

import VendorTitleUpdater from "./VendorTitleUpdater";

export default function VendorClientShell({ children }) {
  return (
    <>
      <VendorTitleUpdater />
      {children}
    </>
  );
}
