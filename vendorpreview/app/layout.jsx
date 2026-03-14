import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import BootstrapClient from "./BootstrapClient";
import Footer from "./Footer/Footer";
import VendorClientShell from "./VendorClientShell";
import { VendorProvider } from "./context/VendorContext";

export const metadata = { title: "" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const host = headerList.get("host") || "";

  const parts = host.split(".");
  const subdomain = parts.length > 1 ? parts[0] : null;

  let vendorContext = null;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  // ===== SUBDOMAIN =====
  if (subdomain && subdomain !== "localhost") {
    try {
      const res = await fetch(
        `${base}/api/vendor/by-subdomain/${subdomain}`,
        { cache: "no-store" }
      );
      if (res.ok) vendorContext = await res.json();
    } catch (e) {
      console.error("Subdomain resolve failed", e);
    }
  }

  // ===== PREVIEW =====
  if (!vendorContext) {
    try {
      const referer = headerList.get("referer") || "";
      const url = new URL(referer || "http://dummy");
      const vendorId = url.searchParams.get("vendorId");

      if (vendorId) {
        const res = await fetch(
          `${base}/api/dummy-vendors/${vendorId}`,
          { cache: "no-store" }
        );
        if (res.ok) vendorContext = await res.json();
      }
    } catch (e) {
      console.error("Preview resolve failed", e);
    }
  }

  console.log("SSR vendorContext:", vendorContext);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <VendorProvider vendor={vendorContext}>
          <BootstrapClient />
          <VendorClientShell>
            {children}
            <Footer />
          </VendorClientShell>
        </VendorProvider>
      </body>
    </html>
  );
}
