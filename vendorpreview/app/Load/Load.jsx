"use client";
import "./Load.css";
import { useSearchParams } from "next/navigation";
import { useVendor } from "../Vendorcontext";

const Loader = () => {
  const searchParams = useSearchParams();
  const vendorName = searchParams.get("vendorName");

  return (
    <div className="loader-wrapper">
      <div className="spinner"></div>
      <h2 className="loader-text">
        {vendorName || "Loading..."}
      </h2>
    </div>
  );
};

export default Loader;
