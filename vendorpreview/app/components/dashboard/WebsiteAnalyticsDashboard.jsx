"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import { getVendorAuthHeaders } from "../../utils/vendorAuth";
import "./RevenuePanels.css";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function WebsiteAnalyticsDashboard({ vendorId }) {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const trend = useMemo(() => {
    const rows = summary?.dailyTrend || [];
    return [...rows].reverse();
  }, [summary]);
  const topSources = summary?.topSources || [];
  const topCampaigns = summary?.topCampaigns || [];
  const overview = summary?.overview || {};

  useEffect(() => {
    if (!vendorId) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/site-analytics/vendor/summary?vendorId=${encodeURIComponent(vendorId)}&days=${days}`,
          {
            headers: {
              ...getVendorAuthHeaders(vendorId),
            },
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || "Failed to load website analytics");
        }

        if (!cancelled) {
          setSummary(data || null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError?.message || "Failed to load website analytics");
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [days, vendorId]);

  return (
    <div className="revenue-panel">
      <div className="revenue-panel-header">
        <div className="revenue-panel-title">Website Analytics</div>
        <div className="revenue-panel-subtitle">
          Understand how many visitors reached your page and how many engaged with your CTAs.
        </div>
      </div>

      <div className="revenue-panel-section-title" style={{ marginBottom: 18 }}>
        Visitor summary
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="revenue-panel-input"
          style={{ maxWidth: 170, marginLeft: "auto" }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error ? (
        <div className="revenue-panel-empty" style={{ color: "#fca5a5" }}>
          {error}
        </div>
      ) : loading ? (
        <div className="revenue-panel-loading">Loading website analytics...</div>
      ) : (
        <>
          <div className="revenue-panel-stat-grid">
            {[
              {
                label: "Page Views",
                value: formatNumber(overview.totalPageViews),
              },
              {
                label: "Unique Visitors",
                value: formatNumber(overview.uniqueVisitors),
              },
              {
                label: "CTA Clicks",
                value: formatNumber(overview.ctaClicks),
              },
              {
                label: "Enquiries",
                value: formatNumber(overview.enquirySubmissions),
              },
            ].map((card) => (
              <div key={card.label} className="revenue-panel-stat-card">
                <div className="revenue-panel-stat-label">{card.label}</div>
                <div className="revenue-panel-stat-value">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="revenue-panel-section">
            <div className="revenue-panel-section-title">Daily trend</div>
            {trend.length ? (
              <div className="revenue-panel-list">
                {trend.map((row) => (
                  <div key={row.date} className="revenue-panel-list-item">
                    <div>
                      <div className="revenue-panel-list-main">{row.date}</div>
                      <div className="revenue-panel-list-sub">
                        Unique Visitors: {formatNumber(row.uniqueVisitors)}
                      </div>
                    </div>
                    <div className="revenue-panel-list-value">
                      Views: {formatNumber(row.views)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="revenue-panel-empty">No visitor data yet.</div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            <div>
              <div className="revenue-panel-section-title">Top sources</div>
              {topSources.length ? (
                <div className="revenue-panel-list">
                  {topSources.map((item) => (
                    <div key={item.source} className="revenue-panel-list-item">
                      <div className="revenue-panel-list-main">{item.source}</div>
                      <div className="revenue-panel-list-value">
                        {formatNumber(item.views)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="revenue-panel-empty">No source data yet.</div>
              )}
            </div>

            <div>
              <div className="revenue-panel-section-title">Top campaigns</div>
              {topCampaigns.length ? (
                <div className="revenue-panel-list">
                  {topCampaigns.map((item) => (
                    <div key={item.campaign} className="revenue-panel-list-item">
                      <div className="revenue-panel-list-main">{item.campaign}</div>
                      <div className="revenue-panel-list-value">
                        {formatNumber(item.views)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="revenue-panel-empty">No campaign data yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
