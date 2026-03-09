"use client";

import { useState } from "react";
import ManageResourcesModal from "./ManageResourcesModal";

export default function ResourceButton({ vendorId, label }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          top: 16,
          padding: "12px 18px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "#000",
          color: "#fff",
          fontWeight: 700,
          zIndex: 5000,
        }}
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
