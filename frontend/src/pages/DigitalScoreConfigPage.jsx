import { useEffect, useState } from "react";
import API from "../api";

const LANGUAGES = [
  { key: "english", label: "English" },
  { key: "telugu", label: "Telugu" },
  { key: "hindi", label: "Hindi" },
];

const DEFAULT_SCORE_RANGES = [
  { min: 0, max: 40, key: "poor", label: { english: "Poor", telugu: "Poor", hindi: "Poor" } },
  { min: 41, max: 70, key: "average", label: { english: "Average", telugu: "Average", hindi: "Average" } },
  { min: 71, max: 85, key: "good", label: { english: "Good", telugu: "Good", hindi: "Good" } },
  { min: 86, max: 100, key: "excellent", label: { english: "Excellent", telugu: "Excellent", hindi: "Excellent" } },
];

const emptyLocalizedText = () => ({ english: "", telugu: "", hindi: "" });

function LocalizedField({ label, value, onChange, multiline = false }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>{label}</h3>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {LANGUAGES.map((language) => {
          const InputTag = multiline ? "textarea" : "input";
          return (
            <label key={language.key} style={{ display: "grid", gap: 6, fontWeight: 600, color: "#4b5563" }}>
              <span>{language.label}</span>
              <InputTag
                value={value?.[language.key] || ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [language.key]: event.target.value,
                  })
                }
                rows={multiline ? 4 : undefined}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  resize: multiline ? "vertical" : "none",
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function DigitalScoreConfigPage() {
  const [form, setForm] = useState({
    isEnabled: true,
    supportedLanguages: ["english"],
    defaultLanguage: "english",
    title: emptyLocalizedText(),
    subtitle: emptyLocalizedText(),
    ctaText: emptyLocalizedText(),
    resultScreenText: emptyLocalizedText(),
    scoreRanges: DEFAULT_SCORE_RANGES,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      try {
        setLoading(true);
        setError("");
        const response = await API.get("/api/admin/digital-score/config");
        if (!mounted) return;
        const config = response?.data?.data;
        if (config) {
          setForm({
            isEnabled: config.isEnabled !== false,
            supportedLanguages: config.supportedLanguages?.length ? config.supportedLanguages : ["english"],
            defaultLanguage: config.defaultLanguage || "english",
            title: config.title || emptyLocalizedText(),
            subtitle: config.subtitle || emptyLocalizedText(),
            ctaText: config.ctaText || emptyLocalizedText(),
            resultScreenText: config.resultScreenText || emptyLocalizedText(),
            scoreRanges: config.scoreRanges?.length ? config.scoreRanges : DEFAULT_SCORE_RANGES,
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || "Failed to load Digital Score config.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleLanguage(languageKey) {
    setForm((current) => {
      const exists = current.supportedLanguages.includes(languageKey);
      const nextLanguages = exists
        ? current.supportedLanguages.filter((key) => key !== languageKey)
        : [...current.supportedLanguages, languageKey];
      const normalizedLanguages = nextLanguages.length ? nextLanguages : ["english"];
      return {
        ...current,
        supportedLanguages: normalizedLanguages,
        defaultLanguage: normalizedLanguages.includes(current.defaultLanguage)
          ? current.defaultLanguage
          : normalizedLanguages[0],
      };
    });
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSuccess("");
      setError("");
      const payload = {
        ...form,
        supportedLanguages: form.supportedLanguages.length ? form.supportedLanguages : ["english"],
      };
      await API.put("/api/admin/digital-score/config", payload);
      setSuccess("Digital Score config updated.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save Digital Score config.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, fontSize: 18 }}>Loading Digital Score config...</div>;
  }

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 32 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 34, color: "#111827" }}>Digital Score Config</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 16 }}>
          Control the public Digital Score experience shown on the Ynot homepage.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(event) => setForm((current) => ({ ...current, isEnabled: event.target.checked }))}
            />
            <span>Enable Digital Score</span>
          </label>

          <label style={{ display: "grid", gap: 8, fontWeight: 600, color: "#374151" }}>
            <span>Default Language</span>
            <select
              value={form.defaultLanguage}
              onChange={(event) => setForm((current) => ({ ...current, defaultLanguage: event.target.value }))}
              style={inputStyle}
            >
              {form.supportedLanguages.map((languageKey) => (
                <option key={languageKey} value={languageKey}>
                  {LANGUAGES.find((language) => language.key === languageKey)?.label || languageKey}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>Supported Languages</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {LANGUAGES.map((language) => (
              <label key={language.key} style={checkboxPillStyle(form.supportedLanguages.includes(language.key))}>
                <input
                  type="checkbox"
                  checked={form.supportedLanguages.includes(language.key)}
                  onChange={() => toggleLanguage(language.key)}
                />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <LocalizedField label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
      </div>

      <div style={cardStyle}>
        <LocalizedField
          label="Subtitle"
          value={form.subtitle}
          onChange={(value) => setForm((current) => ({ ...current, subtitle: value }))}
          multiline
        />
      </div>

      <div style={cardStyle}>
        <LocalizedField label="CTA Text" value={form.ctaText} onChange={(value) => setForm((current) => ({ ...current, ctaText: value }))} />
      </div>

      <div style={cardStyle}>
        <LocalizedField
          label="Result Screen Text"
          value={form.resultScreenText}
          onChange={(value) => setForm((current) => ({ ...current, resultScreenText: value }))}
          multiline
        />
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>Score Ranges</h3>
        <div style={{ display: "grid", gap: 16 }}>
          {form.scoreRanges.map((range, index) => (
            <div
              key={`${range.key}-${index}`}
              style={{
                display: "grid",
                gap: 12,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6, fontWeight: 600, color: "#4b5563" }}>
                  <span>Min</span>
                  <input
                    type="number"
                    value={range.min}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scoreRanges: current.scoreRanges.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, min: Number(event.target.value) } : item
                        ),
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 600, color: "#4b5563" }}>
                  <span>Max</span>
                  <input
                    type="number"
                    value={range.max}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scoreRanges: current.scoreRanges.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, max: Number(event.target.value) } : item
                        ),
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontWeight: 600, color: "#4b5563" }}>
                  <span>Key</span>
                  <input
                    value={range.key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scoreRanges: current.scoreRanges.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value.toLowerCase() } : item
                        ),
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
              </div>

              <LocalizedField
                label="Range Label"
                value={range.label || emptyLocalizedText()}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    scoreRanges: current.scoreRanges.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: value } : item
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {(error || success) && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: error ? "#fef2f2" : "#ecfdf5",
            color: error ? "#b91c1c" : "#166534",
            border: `1px solid ${error ? "#fecaca" : "#bbf7d0"}`,
          }}
        >
          {error || success}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={handleSave} disabled={saving} style={primaryButtonStyle}>
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e5e7eb",
  display: "grid",
  gap: 20,
};

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
};

const checkboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
  color: "#1f2937",
};

const checkboxPillStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 999,
  border: `1px solid ${active ? "#0ea5e9" : "#d1d5db"}`,
  background: active ? "#eff6ff" : "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  color: "#1f2937",
});

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
