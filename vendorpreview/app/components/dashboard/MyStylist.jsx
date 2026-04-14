"use client";
import { useEffect, useState } from "react";
import { useVendor } from "../../context/VendorContext";
import "./MyStylists.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

const EMPTY_FORM = {
  name: "",
  phone: "",
  role: "",
};

export default function MyStylists({
  vendorId,
  resourceLabelPlural = "Stylists",
  resourceLabelSingular = "Stylist",
}) {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { setVendorInfo } = useVendor();

  const loadStylists = async () => {
    if (!vendorId) {
      setStylists([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        "";

      const response = await fetch(
        `${API_BASE_URL}/api/vendor-resources?vendorId=${vendorId}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load ${resourceLabelPlural.toLowerCase()}`);
      }

      const data = await response.json();
      const nextStylists = Array.isArray(data) ? data : [];
      setStylists(nextStylists);
      setVendorInfo((prev) => (prev ? { ...prev, resources: nextStylists } : prev));
    } catch (error) {
      console.error(`Failed to fetch ${resourceLabelPlural.toLowerCase()}`, error);
      setStylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStylists();
  }, [vendorId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!vendorId || !formData.name.trim() || !formData.phone.trim() || !formData.role.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        "";

      const response = await fetch(`${API_BASE_URL}/api/vendor-resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: formData.role.trim(),
          vendorId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ${resourceLabelSingular.toLowerCase()}`);
      }

      setFormData(EMPTY_FORM);
      setShowModal(false);
      await loadStylists();
    } catch (error) {
      console.error(`Failed to create ${resourceLabelSingular.toLowerCase()}`, error);
      alert(error.message || `Failed to create ${resourceLabelSingular.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

const handleToggleStatus = async (stylistId, currentStatus) => {
  const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";

  try {
    setUpdatingStatusId(stylistId);

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "";

    const response = await fetch(
      `${API_BASE_URL}/api/vendor-resources/${stylistId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update ${resourceLabelSingular.toLowerCase()} status`);
    }

    const nextStylists = stylists.map((stylist) =>
      stylist._id === stylistId
        ? { ...stylist, status: nextStatus }
        : stylist
    );

    setStylists(nextStylists);

    setVendorInfo((current) =>
      current ? { ...current, resources: nextStylists } : current
    );

  } catch (error) {
    console.error(`Failed to update ${resourceLabelSingular.toLowerCase()} status`, error);
    alert(error.message || `Failed to update ${resourceLabelSingular.toLowerCase()} status`);
  } finally {
    setUpdatingStatusId(null);
  }
};

  return (
      <div className="stylists-page">
      <div className="stylists-header">
        <h2>{`My ${resourceLabelPlural}`}</h2>

        <button
          className="add-stylist-btn"
          type="button"
          onClick={() => setShowModal(true)}
        >
          {`+ Add ${resourceLabelSingular}`}
        </button>
      </div>

      {loading ? (
        <div className="stylists-state">{`Loading ${resourceLabelPlural.toLowerCase()}...`}</div>
      ) : stylists.length === 0 ? (
        <div className="stylists-state">{`No ${resourceLabelPlural.toLowerCase()} found.`}</div>
      ) : (
        <div className="stylists-grid">
          {stylists.map((stylist) => (
            <div
              key={stylist._id || `${stylist.name}-${stylist.phone}`}
              className="stylist-card"
            >
              <div className="stylist-card-top">
                <div className="stylist-card-label">{resourceLabelSingular}</div>
                <span
                  className={`stylist-status-badge ${
                    stylist.status === "Active"
                      ? "stylist-status-active"
                      : "stylist-status-inactive"
                  }`}
                >
                  {stylist.status || "Inactive"}
                </span>
              </div>
              <h3>{stylist.name}</h3>
              <p className="stylist-meta">
                <span>Phone</span>
                <strong>{stylist.phone || "-"}</strong>
              </p>
              <p className="stylist-meta">
                <span>Role</span>
                <strong>{stylist.role || "-"}</strong>
              </p>
              <div className="stylist-status-row">
                <span className="stylist-status-label">Status</span>
                <label className="stylist-switch">
                  <input
                    type="checkbox"
                    checked={stylist.status === "Active"}
                    disabled={updatingStatusId === stylist._id}
                    onChange={() =>
                      handleToggleStatus(stylist._id, stylist.status)
                    }
                  />
                  <span className="stylist-switch-track">
                    <span className="stylist-switch-thumb" />
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="stylist-modal-overlay"
          onClick={() => {
            if (!submitting) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="stylist-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{`Add ${resourceLabelSingular}`}</h3>

            <form className="stylist-form" onSubmit={handleSubmit}>
              <label className="stylist-field">
                <span>Name</span>
                <input
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder={`Enter ${resourceLabelSingular.toLowerCase()} name`}
                />
              </label>

              <label className="stylist-field">
                <span>Phone</span>
                <input
                  value={formData.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="Enter phone number"
                />
              </label>

              <label className="stylist-field">
                <span>Role</span>
                <input
                  value={formData.role}
                  onChange={(event) => handleChange("role", event.target.value)}
                  placeholder="Enter role"
                />
              </label>

              <div className="stylist-form-actions">
                <button
                  className="stylist-cancel-btn"
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="stylist-save-btn"
                  type="submit"
                  disabled={
                    submitting ||
                    !formData.name.trim() ||
                    !formData.phone.trim() ||
                    !formData.role.trim()
                  }
                >
                  {submitting ? "Saving..." : `Save ${resourceLabelSingular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
