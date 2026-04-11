"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer/Footer";
import VendorTitleUpdater from "./VendorTitleUpdater";

function shouldHideFooter(pathname) {
  return pathname.startsWith("/b/") || pathname.startsWith("/bill/");
}

export default function AppChrome({ children }) {
  const pathname = usePathname() || "/";
  const hideFooter = shouldHideFooter(pathname);

  return (
    <>
      <VendorTitleUpdater />
      {children}
      {!hideFooter ? <Footer /> : null}
    </>
  );
}
