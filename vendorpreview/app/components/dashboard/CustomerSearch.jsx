"use client";

import { useMemo, useState } from "react";
import "./RevenuePanels.css";

const CUSTOMER_SEARCH_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatItemMeta(item) {
  const parts = [];

  if (Number(item?.qty || 0) > 0) {
    parts.push(`Qty ${item.qty}`);
  }

  if (Array.isArray(item?.nodePath) && item.nodePath.length > 0) {
    parts.push(item.nodePath.join(" / "));
  }

  return parts.join(" • ");
}

function formatItemResource(item) {
  return String(item?.resourceName || "").trim();
}

export default function CustomerSearch({ vendorId }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedBills, setExpandedBills] = useState({});

  const sections = useMemo(() => {
    const customer = customerData?.customer || {};
    const loyalty = customerData?.loyalty || {};
    const retention = customerData?.retention || {};

    return {
      overview: [
        { label: "Phone", value: customer.phone ?? "-" },
        { label: "Total Visits", value: customer.totalVisits ?? "-" },
        {
          label: "Total Spend",
          value: customer.totalSpend != null ? currencyFmt.format(Number(customer.totalSpend || 0)) : "-",
        },
        {
          label: "Average Bill",
          value: customer.avgBill != null ? currencyFmt.format(Number(customer.avgBill || 0)) : "-",
        },
        {
          label: "Last Visit",
          value: customer.lastVisit ? formatDateTime(customer.lastVisit) : "-",
        },
      ],
      loyalty: [
        { label: "Available Points", value: loyalty.availablePoints ?? "-" },
        { label: "Total Points Earned", value: loyalty.earned ?? "-" },
        { label: "Total Points Redeemed", value: loyalty.redeemed ?? "-" },
        { label: "Expired Points", value: loyalty.expiredPoints ?? "-" },
        { label: "Expiring Soon", value: loyalty.expiringSoonPoints ?? "-" },
      ],
      retention: [
        { label: "Total Customers", value: retention.totalCustomers ?? "-" },
        { label: "Returning Customers", value: retention.returningCustomers ?? "-" },
        {
          label: "Retention Score",
          value: retention.retentionScore != null ? `${retention.retentionScore}%` : "-",
        },
      ],
    };
  }, [customerData]);

  const bills = useMemo(() => {
    const rawBills = Array.isArray(customerData?.bills) ? customerData.bills : [];
    return rawBills
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.transactionDate) -
          new Date(a.createdAt || a.transactionDate)
      );
  }, [customerData]);

  const handleSearch = async () => {
    if (!vendorId || phone.length !== 10) {
      setCustomerData(null);
      setHasSearched(false);
      setErrorMessage("");
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      setErrorMessage("");
      const formattedPhone = `91${phone.trim()}`;
      const res = await fetch(
        `${CUSTOMER_SEARCH_API_BASE_URL}/api/vendor/dashboard/customer?vendorId=${encodeURIComponent(vendorId)}&phone=${encodeURIComponent(formattedPhone)}&range=all`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Failed to search customer");
      }

      const json = await res.json();
      const payload = json?.data && typeof json.data === "object" ? json.data : json;
      setCustomerData(payload?.customer ? payload : null);
      setExpandedBills({});
    } catch (error) {
      console.error("Failed to fetch customer data", error);
      setCustomerData(null);
      setExpandedBills({});
      setErrorMessage("Unable to fetch customer data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBill = (billKey) => {
    setExpandedBills((prev) => ({
      ...prev,
      [billKey]: !prev[billKey],
    }));
  };

  return (
    <section className="revenue-panel">
      <div className="revenue-panel-header">
        <div className="revenue-panel-title">Customer Search</div>
        <div className="revenue-panel-subtitle">
          Search by mobile number to inspect customer, loyalty, and retention details.
        </div>
      </div>

      <div className="revenue-panel-search-row">
        <div className="revenue-panel-phone-input">
          <div className="revenue-panel-phone-prefix">+91</div>
          <input
            className="revenue-panel-input revenue-panel-input-phone"
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Enter 10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <button
          type="button"
          className="revenue-panel-button"
          onClick={handleSearch}
          disabled={loading || phone.length !== 10}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMessage ? (
        <div className="revenue-panel-empty">{errorMessage}</div>
      ) : customerData ? (
        <>
          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Customer Overview</div>
            <div className="revenue-panel-customer-grid">
              {sections.overview.map((item) => (
                <div key={item.label} className="revenue-panel-customer-card">
                  <div className="revenue-panel-customer-label">{item.label}</div>
                  <div className="revenue-panel-customer-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Loyalty Summary</div>
            <div className="revenue-panel-customer-grid">
              {sections.loyalty.map((item) => (
                <div key={item.label} className="revenue-panel-customer-card">
                  <div className="revenue-panel-customer-label">{item.label}</div>
                  <div className="revenue-panel-customer-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Customer Retention</div>
            <div className="revenue-panel-customer-grid">
              {sections.retention.map((item) => (
                <div key={item.label} className="revenue-panel-customer-card">
                  <div className="revenue-panel-customer-label">{item.label}</div>
                  <div className="revenue-panel-customer-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Billing History</div>
            {bills.length === 0 ? (
              <div className="revenue-panel-empty">No bills found for this customer.</div>
            ) : (
              <div className="revenue-panel-list">
                {bills.map((bill, index) => {
                  const billKey = bill.billId || `${bill.phone}-${index}`;
                  const isExpanded = expandedBills[billKey] === true;
                  const billItems = Array.isArray(bill.items) ? bill.items : [];

                  return (
                    <div
                      key={billKey}
                      className="revenue-panel-list-item"
                    >
                      <div className="revenue-panel-bill-content">
                        <div className="revenue-panel-list-main">
                          {currencyFmt.format(
                            Number(bill.total || bill.amount || bill.totalAmount || 0)
                          )}
                        </div>
                        <div className="revenue-panel-list-sub">
                          {formatDateTime(bill.createdAt || bill.transactionDate)}
                        </div>
                        <div className="revenue-panel-list-sub">
                          {billItems
                            .map((item) => item.name)
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </div>

                        {isExpanded && billItems.length > 0 ? (
                          <div className="revenue-panel-items-list">
                            {billItems.map((item, itemIndex) => (
                              <div
                                key={`${billKey}-item-${item.itemId || item.name || itemIndex}`}
                                className="revenue-panel-item-row"
                              >
                                <div>
                                  <div className="revenue-panel-item-name">{item.name || "Unnamed Item"}</div>
                                  <div className="revenue-panel-item-meta">{formatItemMeta(item)}</div>
                                  {formatItemResource(item) ? (
                                    <div className="revenue-panel-item-resource">
                                      Handled by {formatItemResource(item)}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="revenue-panel-item-value">
                                  {currencyFmt.format(Number(item.total || item.price || 0))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="revenue-panel-bill-actions">
                        <div className="revenue-panel-list-value">
                          +{Number(bill.earned || bill.pointsEarned || 0)} pts
                        </div>
                        {Number(bill.redeemed || 0) > 0 ? (
                          <div className="revenue-panel-list-sub">
                            Redeemed {Number(bill.redeemed || 0)} pts
                          </div>
                        ) : null}
                        {billItems.length > 0 ? (
                          <button
                            type="button"
                            className="revenue-panel-expand-btn"
                            onClick={() => toggleBill(billKey)}
                          >
                            {isExpanded ? "Hide items" : "View items"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
	              </div>
            )}
          </div>
        </>
      ) : hasSearched && !loading ? (
        <div className="revenue-panel-empty">
          No customer data found for this phone number.
        </div>
      ) : (
        <div className="revenue-panel-empty">
          Enter a mobile number and search to view customer details.
        </div>
      )}
    </section>
  );
}
