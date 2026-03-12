"use client";

import { useEffect, useState } from "react";
import resourceService from "../services/resourceService";
import AddResourceModal from "./AddResourceModal";
import { API_BASE_URL } from "../../../config";

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

  async function deactivateResource(id) {
    await resourceService.updateResource(id, {
      status: "Inactive",
    });

    loadResources();
  }

  async function activateResource(id) {
    await fetch(`${API_BASE_URL}/api/vendor-resources/${id}/activate`, {
      method: "PUT",
    });

    loadResources();
  }

  const sortedResources = [...resources].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "Active" ? -1 : 1;
  });

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
          {sortedResources.map((r) => (
            <tr key={r._id}>
              <td>{r.name}</td>
              <td>{r.role}</td>
              <td>
                <span
                  className={
                    r.status === "Active" ? "statusActive" : "statusInactive"
                  }
                >
                  {r.status}
                </span>
              </td>

              <td>
                {r.status === "Active" ? (
                  <button onClick={() => deactivateResource(r._id)}>
                    Inactivate
                  </button>
                ) : (
                  <button onClick={() => activateResource(r._id)}>
                    Activate
                  </button>
                )}
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
