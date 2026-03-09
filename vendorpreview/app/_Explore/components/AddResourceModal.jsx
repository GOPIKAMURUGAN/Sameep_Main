"use client";

import { useState } from "react";
import resourceService from "../services/resourceService";

export default function AddResourceModal({ vendorId, onSaved, onClose }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");

  async function save() {
    await resourceService.createResource({
      vendorId,
      name,
      role,
      phone,
    });

    onSaved();
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "400px",
        background: "#fff",
        borderRadius: "10px",
        padding: "20px",
        zIndex: 7000,
      }}
    >
      <h3>Add Resource</h3>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />

      <input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={save}>Save</button>

        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
