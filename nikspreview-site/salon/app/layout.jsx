import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BootstrapClient from "./BootstrapClient";
import Footer from "./Footer/Footer";
import { VendorProvider } from "./Vendorcontext";
import VendorTitleUpdater from "./VendorTitleUpdater";

export const metadata = {
  title: "", // ✅ prevents URL from appearing
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <BootstrapClient />

        <VendorProvider>
          <VendorTitleUpdater />
          {children}
          <Footer />
        </VendorProvider>
      </body>
    </html>
  );
}
