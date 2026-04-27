import { useEffect, useMemo, useState } from "react";
import API from "../api";

function cardStyle() {
  return {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function SiteAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");
        const { data } = await API.get(`/api/site-analytics/admin/summary?days=${days}`);
        if (!cancelled) {
          setSummary(data || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "Failed to load site analytics."
          );
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
  }, [days]);

  const overview = summary?.overview || {};
  const trend = useMemo(() => summary?.dailyTrend || [], [summary]);
  const topSources = summary?.topSources || [];
  const topCampaigns = summary?.topCampaigns || [];
  const topVendorPages = summary?.topVendorPages || [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Website Analytics</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            YNOT home page and vendor preview visitor analytics.
          </p>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "#475569", fontWeight: 600 }}>Range</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#fff",
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {error ? (
        <div
          style={{
            ...cardStyle(),
            borderColor: "#fecaca",
            color: "#991b1b",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        <div style={cardStyle()}>
          <div style={{ color: "#64748b", fontSize: "14px" }}>Total Page Views</div>
          <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
            {loading ? "..." : formatNumber(overview.totalPageViews)}
          </div>
        </div>
        <div style={cardStyle()}>
          <div style={{ color: "#64748b", fontSize: "14px" }}>Unique Visitors</div>
          <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
            {loading ? "..." : formatNumber(overview.uniqueVisitors)}
          </div>
        </div>
        <div style={cardStyle()}>
          <div style={{ color: "#64748b", fontSize: "14px" }}>YNOT Home Views</div>
          <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
            {loading ? "..." : formatNumber(overview.ynotHomeViews)}
          </div>
          <div style={{ color: "#64748b", marginTop: "8px", fontSize: "13px" }}>
            Unique: {loading ? "..." : formatNumber(overview.ynotHomeUniqueVisitors)}
          </div>
          <div style={{ color: "#64748b", marginTop: "6px", fontSize: "13px" }}>
            CTA clicks: {loading ? "..." : formatNumber(overview.ynotHomeCtaClicks)}
          </div>
        </div>
        <div style={cardStyle()}>
          <div style={{ color: "#64748b", fontSize: "14px" }}>Vendor Page Views</div>
          <div style={{ fontSize: "32px", fontWeight: 800, marginTop: "8px" }}>
            {loading ? "..." : formatNumber(overview.vendorPageViews)}
          </div>
          <div style={{ color: "#64748b", marginTop: "8px", fontSize: "13px" }}>
            Unique: {loading ? "..." : formatNumber(overview.vendorPageUniqueVisitors)}
          </div>
          <div style={{ color: "#64748b", marginTop: "6px", fontSize: "13px" }}>
            CTA clicks: {loading ? "..." : formatNumber(overview.vendorCtaClicks)}
          </div>
          <div style={{ color: "#64748b", marginTop: "6px", fontSize: "13px" }}>
            Enquiries: {loading ? "..." : formatNumber(overview.vendorEnquirySubmissions)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontWeight: 700, marginBottom: "14px" }}>Daily Trend</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {loading ? (
              <div style={{ color: "#64748b" }}>Loading trend…</div>
            ) : trend.length ? (
              trend.map((row) => (
                <div
                  key={row.date}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr 1fr 1fr",
                    gap: "10px",
                    padding: "10px 0",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "14px",
                  }}
                >
                  <strong>{row.date}</strong>
                  <span>Home: {formatNumber(row.homeViews)}</span>
                  <span>Vendor: {formatNumber(row.vendorViews)}</span>
                  <span>Unique: {formatNumber(row.uniqueVisitors)}</span>
                </div>
              ))
            ) : (
              <div style={{ color: "#64748b" }}>No trend data yet.</div>
            )}
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontWeight: 700, marginBottom: "14px" }}>Top Sources</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {loading ? (
              <div style={{ color: "#64748b" }}>Loading…</div>
            ) : topSources.length ? (
              topSources.map((item) => (
                <div
                  key={item.source}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 0",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span>{item.source}</span>
                  <strong>{formatNumber(item.views)}</strong>
                </div>
              ))
            ) : (
              <div style={{ color: "#64748b" }}>No source data yet.</div>
            )}
          </div>

          <div style={{ fontWeight: 700, margin: "22px 0 14px" }}>Top Campaigns</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {loading ? (
              <div style={{ color: "#64748b" }}>Loading…</div>
            ) : topCampaigns.length ? (
              topCampaigns.map((item) => (
                <div
                  key={item.campaign}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 0",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span>{item.campaign}</span>
                  <strong>{formatNumber(item.views)}</strong>
                </div>
              ))
            ) : (
              <div style={{ color: "#64748b" }}>No campaign data yet.</div>
            )}
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontWeight: 700, marginBottom: "14px" }}>
            Top Vendor Preview Pages
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {loading ? (
              <div style={{ color: "#64748b" }}>Loading…</div>
            ) : topVendorPages.length ? (
              topVendorPages.map((item) => (
                <div
                  key={item.vendorId}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{item.vendorName}</div>
                  <div style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>
                    Views: {formatNumber(item.views)} · Unique:{" "}
                    {formatNumber(item.uniqueVisitors)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#64748b" }}>No vendor preview visits yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
