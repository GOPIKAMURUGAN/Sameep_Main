"use client";

import "./Load.css";
import { useVendor } from "@/app/context/VendorContext";

const Loader = () => {
  const { vendorInfo } = useVendor();

  const name =
    vendorInfo?.businessName ||
    vendorInfo?.name ||
    "Loading...";

  return (
    <div className="loader-wrapper">
      <div className="spinner"></div>
      <h2 className="loader-text">{name}</h2>
    </div>
  );
};

export default Loader;
