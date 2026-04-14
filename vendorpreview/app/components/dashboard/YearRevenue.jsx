"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import "./RevenuePanels.css";

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function YearRevenue({
  vendorId,
  hrEnabled = true,
  hrLabelSingular = "Stylist",
  hrPerformanceTitle = "Stylist Performance",
}) {
  const [activeSection, setActiveSection] = useState("revenue");
  const [summary, setSummary] = useState(null);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stylists, setStylists] = useState([]);
  const [loadingStylists, setLoadingStylists] = useState(true);

  useEffect(() => {
    if (!hrEnabled && activeSection === "stylists") {
      setActiveSection("revenue");
    }
  }, [hrEnabled, activeSection]);

  useEffect(() => {
    if (!vendorId) {
      setSummary(null);
      setMonths([]);
      setLoading(false);
      setStylists([]);
      setLoadingStylists(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);

        const [summaryRes, fyRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vendor/dashboard/summary?vendorId=${encodeURIComponent(vendorId)}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/api/vendor/dashboard/fy-monthly?vendorId=${encodeURIComponent(vendorId)}`, {
            cache: "no-store",
          }),
        ]);

        if (!summaryRes.ok || !fyRes.ok) {
          throw new Error("Failed to load yearly revenue");
        }

        const summaryJson = await summaryRes.json();
        const fyJson = await fyRes.json();

        if (!cancelled) {
          setSummary(summaryJson?.data || null);
          setMonths(Array.isArray(fyJson?.data) ? fyJson.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch yearly revenue", error);
        if (!cancelled) {
          setSummary(null);
          setMonths([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadStylists = async () => {
      if (!hrEnabled) {
        if (!cancelled) {
          setStylists([]);
          setLoadingStylists(false);
        }
        return;
      }

      try {
        setLoadingStylists(true);
        const res = await fetch(
          `${API_BASE_URL}/api/vendor/dashboard/stylist-performance?vendorId=${encodeURIComponent(vendorId)}&range=ytd`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error(`Failed to load ${hrLabelSingular.toLowerCase()} performance`);
        }

        const json = await res.json();
        const rawStylists = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];

        if (!cancelled) {
          setStylists(rawStylists);
        }
      } catch (error) {
        console.error(`Failed to fetch ${hrLabelSingular.toLowerCase()} performance`, error);
        if (!cancelled) {
          setStylists([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingStylists(false);
        }
      }
    };

    loadData();
    loadStylists();

    return () => {
      cancelled = true;
    };
  }, [vendorId, hrEnabled, hrLabelSingular]);

  const totals = useMemo(() => {
    const summaryRevenue = Number(
      summary?.thisYearRevenue ?? summary?.yearRevenue ?? summary?.yearlyRevenue ?? 0
    );
    const monthlyRevenue = months.reduce(
      (acc, month) => acc + Number(month?.revenue || 0),
      0
    );
    const totalOrders = months.reduce((acc, month) => acc + Number(month?.orders || 0), 0);
    const bestMonth = months.reduce((best, month) => {
      if (!best || Number(month?.revenue || 0) > Number(best?.revenue || 0)) {
        return month;
      }
      return best;
    }, null);

    return {
      totalRevenue: summaryRevenue > 0 ? summaryRevenue : monthlyRevenue,
      totalOrders,
      activeMonths: months.filter((month) => Number(month?.revenue || 0) > 0).length,
      bestMonth,
    };
  }, [months, summary]);

  const currentMonth = new Date().toLocaleString("en-IN", { month: "short" });

  return (
    <section className="revenue-panel">
      <div className="revenue-panel-header">
        <div className="revenue-panel-title">This Year Revenue</div>
        <div className="revenue-panel-subtitle">
          Financial year revenue with month-by-month performance.
        </div>
      </div>
      <div className="revenue-panel-tabs">
        <button
          type="button"
          className={`revenue-panel-tab ${activeSection === "revenue" ? "active" : ""}`}
          onClick={() => setActiveSection("revenue")}
        >
          Revenue
        </button>
        {hrEnabled ? (
          <button
            type="button"
            className={`revenue-panel-tab ${activeSection === "stylists" ? "active" : ""}`}
            onClick={() => setActiveSection("stylists")}
          >
            {hrPerformanceTitle}
          </button>
        ) : null}
      </div>

      {activeSection === "revenue" ? (
        loading ? (
          <div className="revenue-panel-loading">Loading yearly revenue...</div>
        ) : (
          <>
            <div className="revenue-panel-stat-grid">
              <div className="revenue-panel-stat-card">
                <div className="revenue-panel-stat-label">Total Revenue</div>
                <div className="revenue-panel-stat-value">
                  {currencyFmt.format(totals.totalRevenue)}
                </div>
              </div>
              <div className="revenue-panel-stat-card">
                <div className="revenue-panel-stat-label">Orders This Year</div>
                <div className="revenue-panel-stat-value">{totals.totalOrders}</div>
              </div>
              <div className="revenue-panel-stat-card">
                <div className="revenue-panel-stat-label">Best Month</div>
                <div className="revenue-panel-stat-value">
                  {totals.bestMonth?.month || "-"}
                </div>
              </div>
            </div>

            <div className="revenue-panel-section">
              <div className="revenue-panel-section-title">Monthly Breakdown</div>
              {months.length === 0 ? (
                <div className="revenue-panel-empty">No yearly revenue data found.</div>
              ) : (
                <div className="revenue-panel-month-grid">
                  {months.map((month) => (
                    <div
                      key={month.month}
                      className={`revenue-panel-month-card ${
                        month.month === currentMonth ? "active" : ""
                      }`}
                    >
                      <div className="revenue-panel-month-name">{month.month}</div>
                      <div className="revenue-panel-month-revenue">
                        {currencyFmt.format(Number(month.revenue || 0))}
                      </div>
                      <div className="revenue-panel-month-meta">
                        {Number(month.orders || 0)} orders • Avg{" "}
                        {currencyFmt.format(Number(month.avgBill || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      ) : (
        <div className="revenue-panel-section">
          <div className="revenue-panel-section-title">{hrPerformanceTitle}</div>
          {loadingStylists ? (
            <div className="revenue-panel-loading">{`Loading ${hrLabelSingular.toLowerCase()} performance...`}</div>
          ) : stylists.length === 0 ? (
            <div className="revenue-panel-empty">
              {`No ${hrLabelSingular.toLowerCase()} performance data available for this year.`}
            </div>
          ) : (
            <div className="revenue-panel-list">
              {stylists.map((row, index) => (
                <div
                  key={row._id || row.stylist || index}
                  className="revenue-panel-list-item"
                >
                  <div className="revenue-panel-list-main">
                    {row.stylist || `${hrLabelSingular} ${index + 1}`}
                  </div>
                  <div className="revenue-panel-list-value">
                    {currencyFmt.format(Number(row.revenue || 0))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
