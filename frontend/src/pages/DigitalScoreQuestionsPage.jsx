import { useEffect, useMemo, useState } from "react";
import API from "../api";

const LANGUAGES = ["english", "telugu", "hindi"];
const SECTIONS = ["Discovery", "Trust", "Information", "Conversion", "Retention"];

function createEmptyOption(index = 1) {
  return {
    key: `option_${index}`,
    label: { english: "", telugu: "", hindi: "" },
    scoreValue: 0,
    order: index,
    isActive: true,
  };
}

function createEmptyQuestion() {
  return {
    key: "",
    questionText: { english: "", telugu: "", hindi: "" },
    options: [createEmptyOption(1), createEmptyOption(2)],
    order: 1,
    categoryApplicability: [],
    isActive: true,
    section: "Discovery",
  };
}

export default function DigitalScoreQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createEmptyQuestion());
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/api/admin/digital-score/questions");
      setQuestions(response?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return questions;
    return questions.filter((question) => {
      const values = [
        question.key,
        question.section,
        question.questionText?.english,
        ...(question.categoryApplicability || []),
      ]
        .join(" ")
        .toLowerCase();
      return values.includes(query);
    });
  }, [questions, search]);

  function startCreate() {
    setEditingId("");
    setForm(createEmptyQuestion());
    setSuccess("");
    setError("");
  }

  function startEdit(question) {
    setEditingId(question._id);
    setForm({
      key: question.key || "",
      questionText: question.questionText || { english: "", telugu: "", hindi: "" },
      options: (question.options || []).map((option, index) => ({
        ...option,
        label: option.label || { english: "", telugu: "", hindi: "" },
        order: option.order || index + 1,
        isActive: option.isActive !== false,
      })),
      order: question.order || 1,
      categoryApplicability: question.categoryApplicability || [],
      isActive: question.isActive !== false,
      section: question.section || "Discovery",
    });
    setSuccess("");
    setError("");
  }

  function updateOption(index, updater) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...updater(option) } : option
      ),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [...current.options, createEmptyOption(current.options.length + 1)],
    }));
  }

  function removeOption(index) {
    setForm((current) => ({
      ...current,
      options: current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({ ...option, order: optionIndex + 1 })),
    }));
  }

  async function saveQuestion() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        ...form,
        categoryApplicability: form.categoryApplicability
          .join(",")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
      if (editingId) {
        await API.put(`/api/admin/digital-score/questions/${editingId}`, payload);
        setSuccess("Question updated.");
      } else {
        await API.post("/api/admin/digital-score/questions", payload);
        setSuccess("Question created.");
      }
      await loadQuestions();
      startCreate();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id) {
    const confirmed = window.confirm("Delete this Digital Score question?");
    if (!confirmed) return;
    try {
      setError("");
      setSuccess("");
      await API.delete(`/api/admin/digital-score/questions/${id}`);
      setSuccess("Question deleted.");
      if (editingId === id) {
        startCreate();
      }
      await loadQuestions();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete question.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 32 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 34, color: "#111827" }}>Digital Score Questions</h1>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 16 }}>
          Manage the question set, options, scores, and activation state for the public Digital Score funnel.
        </p>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(320px, 1.1fr) minmax(420px, 1fr)" }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{editingId ? "Edit Question" : "Create Question"}</h2>
            <button type="button" onClick={startCreate} style={secondaryButtonStyle}>
              New Question
            </button>
          </div>

          <label style={fieldStyle}>
            <span>Question Key</span>
            <input
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toLowerCase().replace(/\s+/g, "_") }))}
              style={inputStyle}
              placeholder="google_visibility"
            />
          </label>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label style={fieldStyle}>
              <span>Section</span>
              <select value={form.section} onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))} style={inputStyle}>
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span>Order</span>
              <input
                type="number"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) || 1 }))}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span>Question is active</span>
          </label>

          <label style={fieldStyle}>
            <span>Applicable Categories (comma separated, optional)</span>
            <input
              value={form.categoryApplicability.join(", ")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categoryApplicability: event.target.value.split(",").map((value) => value.trim()),
                }))
              }
              style={inputStyle}
              placeholder="salon, makeup artistry"
            />
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Question Text</h3>
            {LANGUAGES.map((language) => (
              <label key={language} style={fieldStyle}>
                <span style={{ textTransform: "capitalize" }}>{language}</span>
                <input
                  value={form.questionText?.[language] || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      questionText: {
                        ...current.questionText,
                        [language]: event.target.value,
                      },
                    }))
                  }
                  style={inputStyle}
                />
              </label>
            ))}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Options</h3>
              <button type="button" onClick={addOption} style={secondaryButtonStyle}>
                Add Option
              </button>
            </div>
            {form.options.map((option, index) => (
              <div key={`${option.key}-${index}`} style={optionCardStyle}>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.3fr 0.7fr 0.6fr auto" }}>
                  <label style={fieldStyle}>
                    <span>Option Key</span>
                    <input
                      value={option.key}
                      onChange={(event) => updateOption(index, () => ({ key: event.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span>Score</span>
                    <input
                      type="number"
                      value={option.scoreValue}
                      onChange={(event) => updateOption(index, () => ({ scoreValue: Number(event.target.value) || 0 }))}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span>Order</span>
                    <input
                      type="number"
                      value={option.order}
                      onChange={(event) => updateOption(index, () => ({ order: Number(event.target.value) || index + 1 }))}
                      style={inputStyle}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= 1}
                    style={{ ...dangerButtonStyle, alignSelf: "end", opacity: form.options.length <= 1 ? 0.5 : 1 }}
                  >
                    Remove
                  </button>
                </div>
                <label style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={option.isActive !== false}
                    onChange={(event) => updateOption(index, () => ({ isActive: event.target.checked }))}
                  />
                  <span>Option is active</span>
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  {LANGUAGES.map((language) => (
                    <label key={language} style={fieldStyle}>
                      <span style={{ textTransform: "capitalize" }}>{language} label</span>
                      <input
                        value={option.label?.[language] || ""}
                        onChange={(event) =>
                          updateOption(index, (currentOption) => ({
                            label: {
                              ...(currentOption.label || {}),
                              [language]: event.target.value,
                            },
                          }))
                        }
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
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
            <button type="button" onClick={saveQuestion} disabled={saving} style={primaryButtonStyle}>
              {saving ? "Saving..." : editingId ? "Update Question" : "Create Question"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Question Library</h2>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions"
              style={{ ...inputStyle, width: 220 }}
            />
          </div>

          {loading ? (
            <div style={{ color: "#6b7280" }}>Loading questions...</div>
          ) : filteredQuestions.length ? (
            <div style={{ display: "grid", gap: 14 }}>
              {filteredQuestions.map((question) => (
                <div key={question._id} style={questionCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={pillStyle("#eff6ff", "#2563eb")}>{question.section}</span>
                        <span style={pillStyle(question.isActive !== false ? "#ecfdf5" : "#fef2f2", question.isActive !== false ? "#15803d" : "#b91c1c")}>
                          {question.isActive !== false ? "Active" : "Inactive"}
                        </span>
                        <span style={pillStyle("#f3f4f6", "#4b5563")}>Order {question.order}</span>
                      </div>
                      <strong style={{ fontSize: 18, color: "#111827" }}>
                        {question.questionText?.english || question.key}
                      </strong>
                      <span style={{ color: "#6b7280", fontSize: 14 }}>Key: {question.key}</span>
                      <span style={{ color: "#6b7280", fontSize: 14 }}>
                        Options: {(question.options || []).length}
                        {question.categoryApplicability?.length
                          ? ` | Categories: ${question.categoryApplicability.join(", ")}`
                          : " | All categories"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>
                      <button type="button" onClick={() => startEdit(question)} style={secondaryButtonStyle}>
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteQuestion(question._id)} style={dangerButtonStyle}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#6b7280" }}>No questions found.</div>
          )}
        </div>
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
  gap: 18,
};

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontWeight: 600,
  color: "#374151",
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
  padding: "10px 14px",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const dangerButtonStyle = {
  border: "1px solid #fecaca",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#fef2f2",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const optionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 14,
};

const questionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  background: "#ffffff",
};

const pillStyle = (background, color) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background,
  color,
  fontSize: 12,
  fontWeight: 700,
});
