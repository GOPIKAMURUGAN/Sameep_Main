"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import "./EnquiriesDashboard.css";

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value) {
  const amount = Number(value || 0);
  if (!amount) return "Not specified";
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function getEnquiryPhone(enquiry) {
  return String(enquiry?.phone || enquiry?.customerId || "").trim();
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "new") return "new";
  if (normalized === "viewed" || normalized === "enquiry viewed") return "viewed";
  return normalized;
}

function getStatusLabel(value) {
  const normalized = normalizeStatus(value);
  if (normalized === "viewed") return "Viewed";
  if (normalized === "new") return "New";
  return String(value || "New").trim() || "New";
}

function normalizeWhatsappStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "pending";
  if (["sent", "failed", "skipped"].includes(normalized)) return normalized;
  return "pending";
}

function getWhatsappStatusLabel(value) {
  const normalized = normalizeWhatsappStatus(value);
  if (normalized === "sent") return "Alert Sent";
  if (normalized === "failed") return "Alert Failed";
  if (normalized === "skipped") return "Alert Skipped";
  return "Alert Pending";
}

function isReadableDateField(key, value) {
  const keyText = String(key || "").trim().toLowerCase();
  const valueText = String(value || "").trim();
  if (!valueText) return false;

  const keyLooksDateLike =
    keyText.includes("date") ||
    keyText.includes("time") ||
    keyText.includes("slot") ||
    keyText.includes("appointment");

  const valueLooksDateLike =
    /^\d{4}-\d{2}-\d{2}(t|\s)\d{2}:\d{2}/i.test(valueText) ||
    /^\d{4}-\d{2}-\d{2}$/.test(valueText);

  return keyLooksDateLike && valueLooksDateLike;
}

function formatDetailValue(key, value) {
  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(key, item)).join(", ");
  }

  const text = String(value ?? "").trim();
  if (!text) return "-";

  if (isReadableDateField(key, text)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return formatDateOnly(text) || text;
    }

    return formatDateTime(text) || text;
  }

  return text;
}

function getServiceSummary(enquiry) {
  const metaItems = Array.isArray(enquiry?.meta?.cartItems) ? enquiry.meta.cartItems : [];
  if (metaItems.length > 0) {
    return metaItems.map((item) => item.label || item.name || "Service").join(", ");
  }

  const inventoryNames = Array.isArray(enquiry?.attributes?.inventoryNames)
    ? enquiry.attributes.inventoryNames.filter(Boolean)
    : [];
  if (inventoryNames.length > 0) return inventoryNames.join(", ");

  const inventoryName = String(enquiry?.attributes?.inventoryName || "").trim();
  if (inventoryName) return inventoryName;

  const categoryPath = Array.isArray(enquiry?.categoryPath)
    ? enquiry.categoryPath.filter(Boolean).join(" / ")
    : "";
  if (categoryPath) return categoryPath;

  return String(enquiry?.serviceName || "").trim() || "Service enquiry";
}

function getAttributeRows(enquiry) {
  const attributes = enquiry?.attributes && typeof enquiry.attributes === "object"
    ? enquiry.attributes
    : {};

  return Object.entries(attributes).filter(([key, value]) => {
    if (!key) return false;
    if (key === "inventoryName" || key === "inventoryNames") return false;
    if (value == null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return String(value).trim() !== "";
  });
}

export default function EnquiriesDashboard({ vendorId, categoryId }) {
  const [activeTab, setActiveTab] = useState("recent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enquiries, setEnquiries] = useState([]);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");

  useEffect(() => {
    if (!vendorId || !categoryId) return;

    let cancelled = false;

    async function loadEnquiries() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/enquiries?vendorId=${encodeURIComponent(vendorId)}&categoryId=${encodeURIComponent(categoryId)}`
        );
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load enquiries");
        }

        if (cancelled) return;

        const list = (Array.isArray(data) ? data : [])
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        setEnquiries(list);
        setSelectedEnquiryId(list[0]?._id || "");
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError?.message || "Failed to load enquiries");
          setEnquiries([]);
          setSelectedEnquiryId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEnquiries();

    return () => {
      cancelled = true;
    };
  }, [categoryId, vendorId]);

  const groupedEnquiries = useMemo(() => {
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      recent: enquiries.filter((item) => {
        const createdAt = new Date(item?.createdAt || 0);
        return !Number.isNaN(createdAt.getTime()) && createdAt >= tenDaysAgo;
      }),
      month: enquiries.filter((item) => {
        const createdAt = new Date(item?.createdAt || 0);
        return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfMonth;
      }),
      past: enquiries.filter((item) => {
        const createdAt = new Date(item?.createdAt || 0);
        return !Number.isNaN(createdAt.getTime()) && createdAt < startOfMonth;
      }),
    };
  }, [enquiries]);

  const activeEnquiries = groupedEnquiries[activeTab] || [];

  useEffect(() => {
    if (activeEnquiries.some((item) => item?._id === selectedEnquiryId)) return;
    setSelectedEnquiryId(activeEnquiries[0]?._id || "");
  }, [activeEnquiries, selectedEnquiryId]);

  const selectedEnquiry = activeEnquiries.find((item) => item?._id === selectedEnquiryId) || null;
  const selectedPhone = getEnquiryPhone(selectedEnquiry);
  const detailRows = selectedEnquiry ? getAttributeRows(selectedEnquiry) : [];
  const cartItems = Array.isArray(selectedEnquiry?.meta?.cartItems)
    ? selectedEnquiry.meta.cartItems
    : [];
  const selectedStatus = getStatusLabel(selectedEnquiry?.status);
  const selectedWhatsappStatus = getWhatsappStatusLabel(selectedEnquiry?.meta?.vendorWhatsappStatus);
  const selectedWhatsappTone = normalizeWhatsappStatus(selectedEnquiry?.meta?.vendorWhatsappStatus);
  const selectedWhatsappError = String(selectedEnquiry?.meta?.vendorWhatsappError || "").trim();

  useEffect(() => {
    const enquiryId = selectedEnquiry?._id;
    if (!enquiryId) return;

    const normalizedStatus = normalizeStatus(selectedEnquiry?.status);
    if (normalizedStatus === "viewed") return;

    let cancelled = false;

    async function markAsViewed() {
      try {
        setUpdatingStatusId(enquiryId);

        const response = await fetch(`${API_BASE_URL}/api/enquiries/${encodeURIComponent(enquiryId)}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Viewed" }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        setEnquiries((prev) =>
          prev.map((item) => (item?._id === enquiryId ? { ...item, ...data, status: "Viewed" } : item))
        );
      } catch {
        // Keep the UI resilient even if the status update fails.
      } finally {
        if (!cancelled) {
          setUpdatingStatusId((current) => (current === enquiryId ? "" : current));
        }
      }
    }

    markAsViewed();

    return () => {
      cancelled = true;
    };
  }, [selectedEnquiry?._id, selectedEnquiry?.status]);

  return (
    <div className="enquiries-dashboard">
      <div className="enquiries-dashboard-tabs">
        {[
          { key: "recent", label: "Recent Enquiries", meta: "Last 10 days" },
          { key: "month", label: "This Month", meta: "Current month" },
          { key: "past", label: "Past Enquiries", meta: "Older enquiries" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`enquiries-dashboard-tab ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <strong>{groupedEnquiries[tab.key]?.length || 0}</strong>
            <small>{tab.meta}</small>
          </button>
        ))}
      </div>

      {loading ? <div className="enquiries-dashboard-empty">Loading enquiries...</div> : null}
      {error ? <div className="enquiries-dashboard-empty">{error}</div> : null}

      {!loading && !error ? (
        activeEnquiries.length === 0 ? (
          <div className="enquiries-dashboard-empty">No enquiries found in this section.</div>
        ) : (
          <div className="enquiries-dashboard-layout">
            <div className="enquiries-dashboard-list">
              {activeEnquiries.map((enquiry) => {
                const phone = getEnquiryPhone(enquiry);
                const isActive = enquiry?._id === selectedEnquiryId;
                const statusLabel = getStatusLabel(enquiry?.status);
                const statusTone = normalizeStatus(enquiry?.status);
                const whatsappStatusLabel = getWhatsappStatusLabel(enquiry?.meta?.vendorWhatsappStatus);
                const whatsappStatusTone = normalizeWhatsappStatus(enquiry?.meta?.vendorWhatsappStatus);

                return (
                  <button
                    key={enquiry?._id || `${phone}-${enquiry?.createdAt}`}
                    type="button"
                    className={`enquiries-dashboard-row ${isActive ? "is-active" : ""} is-${statusTone}`}
                    onClick={() => setSelectedEnquiryId(enquiry?._id || "")}
                  >
                    <div className="enquiries-dashboard-row-top">
                      <span className="enquiries-dashboard-row-title">
                        {String(enquiry?.serviceName || "Enquiry").trim() || "Enquiry"}
                      </span>
                      <div className="enquiries-dashboard-row-meta">
                        <span className={`enquiries-dashboard-status-badge is-${statusTone}`}>
                          {statusLabel}
                        </span>
                        <span className="enquiries-dashboard-row-date">
                          {formatDateTime(enquiry?.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="enquiries-dashboard-row-subtitle">
                      {phone || "Phone not available"}
                    </div>
                    <div className="enquiries-dashboard-row-badges">
                      <span className={`enquiries-dashboard-status-badge is-${whatsappStatusTone}`}>
                        {whatsappStatusLabel}
                      </span>
                    </div>
                    <div className="enquiries-dashboard-row-summary">
                      {getServiceSummary(enquiry)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="enquiries-dashboard-detail">
              {selectedEnquiry ? (
                <>
                  <div className="enquiries-dashboard-detail-top">
                    <div>
                      <div className="enquiries-dashboard-detail-title">
                        {String(selectedEnquiry?.serviceName || "Enquiry").trim() || "Enquiry"}
                      </div>
                      <div className="enquiries-dashboard-detail-date">
                        {formatDateTime(selectedEnquiry?.createdAt)}
                      </div>
                    </div>

                    {selectedPhone ? (
                      <a
                        className="enquiries-dashboard-call-btn"
                        href={`tel:${selectedPhone}`}
                      >
                        Call Customer
                      </a>
                    ) : null}
                  </div>

                  <div className="enquiries-dashboard-meta-grid">
                    <div className="enquiries-dashboard-meta-card">
                      <span>Customer</span>
                      <strong>{selectedPhone || "Not available"}</strong>
                    </div>
                    <div className="enquiries-dashboard-meta-card">
                      <span>Total Value</span>
                      <strong>{formatAmount(selectedEnquiry?.price)}</strong>
                    </div>
                    <div className="enquiries-dashboard-meta-card">
                      <span>Status</span>
                      <strong>
                        <span className={`enquiries-dashboard-status-badge is-${normalizeStatus(selectedEnquiry?.status)}`}>
                          {selectedStatus}
                        </span>
                        {updatingStatusId === selectedEnquiry?._id ? (
                          <span className="enquiries-dashboard-status-note">Updating...</span>
                        ) : null}
                      </strong>
                    </div>
                    <div className="enquiries-dashboard-meta-card">
                      <span>Vendor WhatsApp</span>
                      <strong>
                        <span className={`enquiries-dashboard-status-badge is-${selectedWhatsappTone}`}>
                          {selectedWhatsappStatus}
                        </span>
                        {selectedWhatsappError ? (
                          <span className="enquiries-dashboard-status-note">
                            {selectedWhatsappError}
                          </span>
                        ) : null}
                      </strong>
                    </div>
                  </div>

                  <div className="enquiries-dashboard-section">
                    <div className="enquiries-dashboard-section-title">Requested Services</div>
                    {cartItems.length > 0 ? (
                      <div className="enquiries-dashboard-services">
                        {cartItems.map((item, index) => (
                          <div
                            key={`${item?.cartKey || item?.itemId || item?.name || index}-${index}`}
                            className="enquiries-dashboard-service-row"
                          >
                            <div>
                              <strong>{item?.label || item?.name || "Service"}</strong>
                              <span>Qty {Number(item?.qty || 0) || 1}</span>
                            </div>
                            <span>{formatAmount(item?.total || item?.price)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="enquiries-dashboard-copy">
                        {getServiceSummary(selectedEnquiry)}
                      </div>
                    )}
                  </div>

                  <div className="enquiries-dashboard-section">
                    <div className="enquiries-dashboard-section-title">Enquiry Details</div>
                    {detailRows.length > 0 ? (
                      <div className="enquiries-dashboard-details-grid">
                        {detailRows.map(([key, value]) => (
                          <div key={key} className="enquiries-dashboard-detail-card">
                            <span>{key}</span>
                            <strong>
                              {formatDetailValue(key, value)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="enquiries-dashboard-copy">
                        No additional details were captured for this enquiry.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="enquiries-dashboard-empty">
                  Select an enquiry to review the details.
                </div>
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
