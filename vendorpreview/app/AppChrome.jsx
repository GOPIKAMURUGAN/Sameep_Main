"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Footer from "./Footer/Footer";
import VendorTitleUpdater from "./VendorTitleUpdater";

function shouldHideFooter(pathname) {
  return pathname.startsWith("/b/") || pathname.startsWith("/bill/");
}

export default function AppChrome({ children }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const activeTemplate = String(searchParams.get("template") || "").trim().toLowerCase();
  const hideFooter = shouldHideFooter(pathname) || activeTemplate === "modern";

  return (
    <>
      <VendorTitleUpdater />
      {children}
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
