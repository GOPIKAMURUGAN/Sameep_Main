"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import "./RevenuePanels.css";

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
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getMonthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export default function MonthRevenue({ vendorId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) {
      setBills([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadBills = async () => {
      try {
        setLoading(true);
        const { from, to } = getMonthRange();
        const res = await fetch(
          `${API_BASE_URL}/api/vendor/dashboard/bills?vendorId=${encodeURIComponent(vendorId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Failed to load month revenue");
        }

        const json = await res.json();
        const rawBills = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];

        if (!cancelled) {
          setBills(rawBills.filter((bill) => Number(bill?.total || 0) > 0));
        }
      } catch (error) {
        console.error("Failed to fetch month revenue", error);
        if (!cancelled) {
          setBills([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBills();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const summary = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        acc.totalBills += 1;
        acc.totalRevenue += Number(bill?.total || 0);
        acc.totalDistributed += Number(bill?.earned || 0);
        acc.totalRedeemed += Number(bill?.redeemed || 0);
        return acc;
      },
      { totalBills: 0, totalRevenue: 0, totalDistributed: 0, totalRedeemed: 0 }
    );
  }, [bills]);

  return (
    <section className="revenue-panel">
      <div className="revenue-panel-header">
        <div className="revenue-panel-title">This Month Revenue</div>
        <div className="revenue-panel-subtitle">
          Running revenue for the current month with the most recent bills.
        </div>
      </div>

      {loading ? (
        <div className="revenue-panel-loading">Loading monthly revenue...</div>
      ) : (
        <>
          <div className="revenue-panel-stat-grid">
            <div className="revenue-panel-stat-card">
              <div className="revenue-panel-stat-label">Total Revenue</div>
              <div className="revenue-panel-stat-value">
                {currencyFmt.format(summary.totalRevenue || 0)}
              </div>
            </div>
            <div className="revenue-panel-stat-card">
              <div className="revenue-panel-stat-label">Bills This Month</div>
              <div className="revenue-panel-stat-value">{summary.totalBills}</div>
            </div>
            <div className="revenue-panel-stat-card">
              <div className="revenue-panel-stat-label">Points Distributed</div>
              <div className="revenue-panel-stat-value">{summary.totalDistributed}</div>
            </div>
            <div className="revenue-panel-stat-card">
              <div className="revenue-panel-stat-label">Points Redeemed</div>
              <div className="revenue-panel-stat-value">{summary.totalRedeemed}</div>
            </div>
          </div>

          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Recent Bills</div>
            {bills.length === 0 ? (
              <div className="revenue-panel-empty">No revenue bills found for this month.</div>
            ) : (
              <div className="revenue-panel-list">
                {bills.slice(0, 8).map((bill) => (
                  <div
                    key={bill.billId || `${bill.phone}-${bill.createdAt}`}
                    className="revenue-panel-list-item"
                  >
                    <div>
                      <div className="revenue-panel-list-main">
                        Bill #{String(bill.billId || "").slice(0, 8)}
                      </div>
                      <div className="revenue-panel-list-sub">
                        {bill.phone || "Walk-in"} • {formatDateTime(bill.createdAt)}
                      </div>
                    </div>
                    <div className="revenue-panel-list-value">
                      {currencyFmt.format(Number(bill.total || 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
