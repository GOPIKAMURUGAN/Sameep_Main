"use client";

import { useEffect, useState } from "react";
import resourceService from "../services/resourceService";
import AddResourceModal from "./AddResourceModal";

export default function ManageResourcesModal({ vendorId, label, onClose }) {
  const [resources, setResources] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    const data = await resourceService.getResources(vendorId);
    setResources(data);
  }

  async function markInactive(r) {
    await resourceService.updateResource(r._id, {
      status: "Inactive",
    });

    loadResources();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "600px",
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        zIndex: 6000,
      }}
    >
      <h2>{label}</h2>

      <table style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {resources.map((r) => (
            <tr key={r._id}>
              <td>{r.name}</td>
              <td>{r.role}</td>
              <td>{r.status}</td>

              <td>
                <button onClick={() => markInactive(r)}>Inactivate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => setShowAdd(true)}>+ Add</button>

        <button onClick={onClose}>Close</button>
      </div>

      {showAdd && (
        <AddResourceModal
          vendorId={vendorId}
          onSaved={loadResources}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
