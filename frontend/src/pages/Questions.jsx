import React, { useEffect, useMemo, useState } from "react";
import API from "../api";

const QUESTION_TYPES = ["years", "range", "select", "multi_select", "boolean", "text", "number"];

function createQuestionKey() {
  return `question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyQuestion(order = 0) {
  return {
    clientKey: createQuestionKey(),
    id: "",
    label: "",
    type: "text",
    optionsText: "",
    placeholder: "",
    helperText: "",
    required: false,
    isActive: true,
    order,
  };
}

function createEmptyConfig() {
  return {
    _id: null,
    clusterKey: "",
    title: "",
    description: "",
    categoryIds: [],
    categoryNames: [],
    isActive: true,
    questions: [createEmptyQuestion(0)],
  };
}

function mapConfigToForm(config) {
  return {
    _id: config?._id || null,
    clusterKey: config?.clusterKey || "",
    title: config?.title || "",
    description: config?.description || "",
    categoryIds: Array.isArray(config?.categoryIds) ? config.categoryIds : [],
    categoryNames: Array.isArray(config?.categoryNames) ? config.categoryNames : [],
    isActive: config?.isActive !== false,
    questions: Array.isArray(config?.questions) && config.questions.length > 0
      ? config.questions
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((question, index) => ({
            clientKey: createQuestionKey(),
            id: question?.id || "",
            label: question?.label || "",
            type: question?.type || "text",
            optionsText: Array.isArray(question?.options) ? question.options.join(", ") : "",
            placeholder: question?.placeholder || "",
            helperText: question?.helperText || "",
            required: question?.required === true,
            isActive: question?.isActive !== false,
            order: typeof question?.order === "number" ? question.order : index,
          }))
      : [createEmptyQuestion(0)],
  };
}

function buildPayload(form, availableCategories) {
  const selectedCategories = availableCategories.filter((category) =>
    form.categoryIds.includes(category._id)
  );

  return {
    clusterKey: form.clusterKey.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    isActive: form.isActive,
    categoryIds: selectedCategories.map((category) => category._id),
    categoryNames: selectedCategories.map((category) => category.name),
    questions: form.questions
      .map((question, index) => ({
        id: String(question.id || "").trim(),
        label: String(question.label || "").trim(),
        type: String(question.type || "").trim(),
        options: String(question.optionsText || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        placeholder: String(question.placeholder || "").trim(),
        helperText: String(question.helperText || "").trim(),
        required: question.required === true,
        isActive: question.isActive !== false,
        order: index,
      }))
      .filter((question) => question.id && question.type),
  };
}

export default function Questions() {
  const [configs, setConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(createEmptyConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [configsRes, categoriesRes] = await Promise.all([
          API.get("/api/admin/trust-questionnaires"),
          API.get("/api/dummy-categories"),
        ]);

        const nextConfigs = Array.isArray(configsRes.data?.data) ? configsRes.data.data : [];
        const nextCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];

        setConfigs(nextConfigs);
        setCategories(nextCategories);

        if (nextConfigs.length > 0) {
          setSelectedId(nextConfigs[0]._id);
          setForm(mapConfigToForm(nextConfigs[0]));
        }
      } catch (loadError) {
        console.error("Failed to load trust questionnaire data", loadError);
        setError("Failed to load questionnaire settings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const selectedConfig = useMemo(
    () => configs.find((config) => config._id === selectedId) || null,
    [configs, selectedId]
  );

  const selectConfig = (config) => {
    setSelectedId(config?._id || null);
    setForm(config ? mapConfigToForm(config) : createEmptyConfig());
    setMessage("");
    setError("");
  };

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const updateQuestion = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      ),
    }));
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion(prev.questions.length)],
    }));
  };

  const removeQuestion = (index) => {
    setForm((prev) => ({
      ...prev,
      questions:
        prev.questions.length === 1
          ? [createEmptyQuestion(0)]
          : prev.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
  };

  const toggleCategory = (categoryId) => {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setForm(createEmptyConfig());
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    const payload = buildPayload(form, categories);
    if (!payload.clusterKey) {
      setError("Cluster key is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = form._id
        ? await API.put(`/api/admin/trust-questionnaires/${form._id}`, payload)
        : await API.post("/api/admin/trust-questionnaires", payload);

      const saved = response.data?.data;
      if (!saved) {
        throw new Error("Invalid server response");
      }

      setConfigs((prev) => {
        const exists = prev.some((config) => config._id === saved._id);
        return exists
          ? prev.map((config) => (config._id === saved._id ? saved : config))
          : [...prev, saved].sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
      });
      setSelectedId(saved._id);
      setForm(mapConfigToForm(saved));
      setMessage("Questionnaire saved");
    } catch (saveError) {
      console.error("Failed to save trust questionnaire", saveError);
      setError(saveError.response?.data?.message || "Failed to save questionnaire");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form._id) {
      handleCreateNew();
      return;
    }

    const confirmed = window.confirm(`Delete cluster "${form.clusterKey}"?`);
    if (!confirmed) return;

    try {
      await API.delete(`/api/admin/trust-questionnaires/${form._id}`);
      const nextConfigs = configs.filter((config) => config._id !== form._id);
      setConfigs(nextConfigs);
      if (nextConfigs.length > 0) {
        selectConfig(nextConfigs[0]);
      } else {
        handleCreateNew();
      }
      setMessage("Questionnaire deleted");
      setError("");
    } catch (deleteError) {
      console.error("Failed to delete trust questionnaire", deleteError);
      setError(deleteError.response?.data?.message || "Failed to delete questionnaire");
    }
  };

  if (loading) {
    return <div>Loading questionnaire settings...</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px" }}>
      <aside
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
          padding: "16px",
          height: "fit-content",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Trust Clusters</h2>
          <button type="button" onClick={handleCreateNew} style={buttonStyle("#00AEEF")}>
            + New
          </button>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {configs.map((config) => (
            <button
              key={config._id}
              type="button"
              onClick={() => selectConfig(config)}
              style={{
                textAlign: "left",
                borderRadius: "8px",
                border: selectedId === config._id ? "1px solid #00AEEF" : "1px solid #ddd",
                background: selectedId === config._id ? "#e6f6fd" : "#fff",
                padding: "12px",
                cursor: "pointer",
              }}
            >
              <strong style={{ display: "block" }}>{config.title || config.clusterKey}</strong>
              <span style={{ fontSize: "12px", color: "#666" }}>
                {config.clusterKey} • {Array.isArray(config.categoryNames) ? config.categoryNames.length : 0} categories
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px" }}>Questions</h1>
            <p style={{ marginTop: "6px", color: "#555" }}>
              Manage category-to-cluster mapping and question options for onboarding trust flows.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={handleDelete} style={buttonStyle("#ef4444")}>
              Delete
            </button>
            <button type="button" onClick={handleSave} disabled={saving} style={buttonStyle("#00AEEF")}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {message ? <div style={{ color: "#166534", marginBottom: "12px" }}>{message}</div> : null}
        {error ? <div style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</div> : null}

        <div style={{ display: "grid", gap: "18px" }}>
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Cluster Details</h3>
            <div style={gridTwoStyle}>
              <LabeledInput
                label="Cluster Key"
                value={form.clusterKey}
                onChange={(value) => updateForm({ clusterKey: value })}
                placeholder="personal_skill"
              />
              <LabeledInput
                label="Title"
                value={form.title}
                onChange={(value) => updateForm({ title: value })}
                placeholder="Personal Skill"
              />
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
                rows={3}
                style={textareaStyle}
              />
            </div>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm({ isActive: event.target.checked })}
              />
              Active
            </label>
          </section>

          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>Category Mapping</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              {categories.map((category) => (
                <label
                  key={category._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: form.categoryIds.includes(category._id) ? "#eff6ff" : "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(category._id)}
                    onChange={() => toggleCategory(category._id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Questions</h3>
              <button type="button" onClick={addQuestion} style={buttonStyle("#22c55e")}>
                + Add Question
              </button>
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              {form.questions.map((question, index) => (
                <div key={question.clientKey || `question-${index}`} style={questionCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <strong>Question {index + 1}</strong>
                    <button type="button" onClick={() => removeQuestion(index)} style={linkButtonStyle}>
                      Remove
                    </button>
                  </div>

                  <div style={gridTwoStyle}>
                    <LabeledInput
                      label="ID"
                      value={question.id}
                      onChange={(value) => updateQuestion(index, { id: value })}
                      placeholder="customers"
                    />
                    <LabeledInput
                      label="Label"
                      value={question.label}
                      onChange={(value) => updateQuestion(index, { label: value })}
                      placeholder="Customers Served"
                    />
                  </div>

                  <div style={{ ...gridTwoStyle, marginTop: "12px" }}>
                    <label style={labelStyle}>
                      Type
                      <select
                        value={question.type}
                        onChange={(event) => updateQuestion(index, { type: event.target.value })}
                        style={inputStyle}
                      >
                        {QUESTION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <LabeledInput
                      label="Placeholder"
                      value={question.placeholder}
                      onChange={(value) => updateQuestion(index, { placeholder: value })}
                      placeholder="Select option"
                    />
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <label style={labelStyle}>Options (comma separated)</label>
                    <textarea
                      value={question.optionsText}
                      onChange={(event) => updateQuestion(index, { optionsText: event.target.value })}
                      rows={3}
                      style={textareaStyle}
                      placeholder="100+, 250+, 500+"
                    />
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <label style={labelStyle}>Helper Text</label>
                    <input
                      value={question.helperText}
                      onChange={(event) => updateQuestion(index, { helperText: event.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "20px", marginTop: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) => updateQuestion(index, { required: event.target.checked })}
                      />
                      Required
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={question.isActive}
                        onChange={(event) => updateQuestion(index, { isActive: event.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px",
  background: "#fafafa",
};

const questionCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "14px",
  background: "#fff",
};

const gridTwoStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const labelStyle = {
  display: "grid",
  gap: "6px",
  fontSize: "14px",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
};

const sectionTitleStyle = {
  margin: "0 0 12px",
  fontSize: "18px",
};

const linkButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#ef4444",
  cursor: "pointer",
  fontWeight: 600,
};

function buttonStyle(background) {
  return {
    padding: "9px 14px",
    borderRadius: "8px",
    border: "none",
    background,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };
}
