import { useEffect, useMemo, useState } from "react";
import API from "../api";

const initialFilters = {
  search: "",
  mobile: "",
  category: "",
  city: "",
  language: "",
};

export default function DigitalScoreSubmissionsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    submissionsByCategory: {},
    submissionsByLanguage: {},
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions(currentFilters = filters) {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/api/admin/digital-score/submissions", {
        params: currentFilters,
      });
      const data = response?.data?.data || {};
      setSummary(data.summary || {
        totalSubmissions: 0,
        averageScore: 0,
        submissionsByCategory: {},
        submissionsByLanguage: {},
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  const categoryEntries = useMemo(
    () => Object.entries(summary.submissionsByCategory || {}),
    [summary.submissionsByCategory]
  );
  const languageEntries = useMemo(
    () => Object.entries(summary.submissionsByLanguage || {}),
    [summary.submissionsByLanguage]
  );

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 32 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 34, color: "#111827" }}>Digital Score Submissions</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 16 }}>
          Review Digital Score leads captured from the Ynot homepage.
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <SummaryCard label="Total Submissions" value={summary.totalSubmissions} />
        <SummaryCard label="Average Score" value={summary.averageScore} />
        <SummaryCard label="Categories Covered" value={categoryEntries.length} />
        <SummaryCard label="Languages Used" value={languageEntries.length} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <FilterInput
            label="Search"
            value={filters.search}
            onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          />
          <FilterInput
            label="Mobile"
            value={filters.mobile}
            onChange={(value) => setFilters((current) => ({ ...current, mobile: value }))}
          />
          <FilterInput
            label="Category"
            value={filters.category}
            onChange={(value) => setFilters((current) => ({ ...current, category: value }))}
          />
          <FilterInput
            label="City"
            value={filters.city}
            onChange={(value) => setFilters((current) => ({ ...current, city: value }))}
          />
          <label style={{ display: "grid", gap: 6, fontWeight: 600, color: "#374151" }}>
            <span>Language</span>
            <select
              value={filters.language}
              onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="english">English</option>
              <option value="telugu">Telugu</option>
              <option value="hindi">Hindi</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => loadSubmissions()} style={primaryButtonStyle}>
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(initialFilters);
              loadSubmissions(initialFilters);
            }}
            style={secondaryButtonStyle}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <DistributionCard title="Submissions by Category" items={categoryEntries} emptyLabel="No category data yet" />
        <DistributionCard title="Submissions by Language" items={languageEntries} emptyLabel="No language data yet" />
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Recent Submissions</h2>
        {error ? (
          <div style={{ color: "#b91c1c" }}>{error}</div>
        ) : loading ? (
          <div style={{ color: "#6b7280" }}>Loading submissions...</div>
        ) : items.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                  {["Name", "Mobile", "City", "Category", "Language", "Score", "Level", "Created"].map((header) => (
                    <th key={header} style={tableHeaderStyle}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td style={tableCellStyle}>{item.businessName || "-"}</td>
                    <td style={tableCellStyle}>{item.mobileNumber || "-"}</td>
                    <td style={tableCellStyle}>{item.city || "-"}</td>
                    <td style={tableCellStyle}>{item.category || "-"}</td>
                    <td style={{ ...tableCellStyle, textTransform: "capitalize" }}>
                      {item.selectedLanguage || "-"}
                    </td>
                    <td style={tableCellStyle}>{item.totalScore ?? "-"}</td>
                    <td style={{ ...tableCellStyle, textTransform: "capitalize" }}>
                      {item.resultLevel || "-"}
                    </td>
                    <td style={tableCellStyle}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No Digital Score submissions yet.</div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={summaryCardStyle}>
      <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 600 }}>{label}</span>
      <strong style={{ color: "#111827", fontSize: 30 }}>{value}</strong>
    </div>
  );
}

function DistributionCard({ title, items, emptyLabel }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      {items.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(([label, count]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 12,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
              }}
            >
              <span style={{ color: "#111827", fontWeight: 600 }}>{label}</span>
              <strong style={{ color: "#2563eb" }}>{count}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#6b7280" }}>{emptyLabel}</div>
      )}
    </div>
  );
}

function FilterInput({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, fontWeight: 600, color: "#374151" }}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 18,
};

const summaryCardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 8,
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 12,
  padding: "14px 22px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 15,
};

const secondaryButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "14px 22px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 15,
};

const tableHeaderStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  fontSize: 13,
  letterSpacing: "0.02em",
};

const tableCellStyle = {
  padding: "14px",
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  fontSize: 14,
};
