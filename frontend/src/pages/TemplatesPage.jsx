import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

function TemplateCard({ template, onChange, onSave, saving }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        background: "#fff",
        boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Template Key
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {template.key}
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: template.status === "Active" ? "#dcfce7" : "#fee2e2",
            color: template.status === "Active" ? "#166534" : "#b91c1c",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {template.status}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Display Name</span>
          <input
            value={template.name}
            onChange={(event) => onChange(template.key, "name", event.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Description</span>
          <textarea
            value={template.description || ""}
            onChange={(event) => onChange(template.key, "description", event.target.value)}
            rows={3}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", resize: "vertical" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Preview Hint</span>
          <input
            value={template.previewHint || ""}
            onChange={(event) => onChange(template.key, "previewHint", event.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={template.status === "Active"}
            onChange={(event) =>
              onChange(template.key, "status", event.target.checked ? "Active" : "Inactive")
            }
          />
          Active
        </label>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input
            type="radio"
            name="default-template"
            checked={Boolean(template.isDefault)}
            onChange={() => onChange(template.key, "isDefault", true)}
          />
          System Default
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => onSave(template)}
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name || "").localeCompare(String(b.name || ""))),
    [templates]
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${API_BASE_URL}/api/preview-templates`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load templates", err);
      setError("Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleChange = (key, field, value) => {
    setTemplates((current) =>
      current.map((template) => {
        if (template.key !== key) return template;
        return { ...template, [field]: value };
      }).map((template) => {
        if (field === "isDefault" && value === true) {
          return { ...template, isDefault: template.key === key };
        }
        return template;
      })
    );
  };

  const handleSave = async (template) => {
    try {
      setSavingKey(template.key);
      await axios.put(`${API_BASE_URL}/api/preview-templates/${template.key}`, {
        name: template.name,
        description: template.description,
        previewHint: template.previewHint,
        status: template.status,
        isDefault: template.isDefault,
      });
      await loadTemplates();
    } catch (err) {
      console.error("Failed to save template", err);
      alert(err?.response?.data?.message || "Failed to save template");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0 }}>Website Templates</h2>
        <p style={{ color: "#64748b", marginTop: 8, maxWidth: 720 }}>
          Manage which coded templates are available to vendors, update their business-facing names,
          and control the system default used when a vendor has not selected one yet.
        </p>
      </div>

      {loading ? <div>Loading templates...</div> : null}
      {!loading && error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}

      {!loading && !error ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          {sortedTemplates.map((template) => (
            <TemplateCard
              key={template.key}
              template={template}
              onChange={handleChange}
              onSave={handleSave}
              saving={savingKey === template.key}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
