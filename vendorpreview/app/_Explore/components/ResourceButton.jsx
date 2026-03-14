"use client";

import { useState } from "react";
import ManageResourcesModal from "./ManageResourcesModal";

export default function ResourceButton({
  vendorId,
  label,
  floating = true,
  className,
}) {
  const [open, setOpen] = useState(false);

  const buttonStyle = {
    padding: "12px 18px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: "#000",
    color: "#fff",
    fontWeight: 700,
    ...(floating
      ? { position: "fixed", right: 24, top: 16, zIndex: 5000 }
      : { position: "relative", zIndex: 1 }),
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={buttonStyle}
        className={className}
      >
        {label}
      </button>

      {open && (
        <ManageResourcesModal
          vendorId={vendorId}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}