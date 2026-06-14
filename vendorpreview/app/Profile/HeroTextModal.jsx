"use client";

import "./Business.css";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { useVendor } from "@/app/context/VendorContext";

function normalizeText(value) {
  return String(value || "");
}

function normalizeQuickHighlights(values) {
  const source = Array.isArray(values) ? values : [];
  const normalized = source
    .slice(0, 3)
    .map((value) => String(value || "").trim().slice(0, 80));

  while (normalized.length < 3) {
    normalized.push("");
  }

  return normalized;
}

function humanizeTrustLabel(question = {}) {
  if (question.label) return question.label;
  const id = String(question.id || "").trim();
  if (!id) return "Answer";
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function HeroTextModal({
  vendorId,
  businessName,
  categoryId = "",
  categoryName = "",
  initialHeading = "",
  initialDescription = "",
  initialQuickHighlights = [],
  onClose,
}) {
  const { setVendorInfo } = useVendor();
  const [heading, setHeading] = useState(() => normalizeText(initialHeading));
  const [description, setDescription] = useState(() => normalizeText(initialDescription));
  const [quickHighlights, setQuickHighlights] = useState(() =>
    normalizeQuickHighlights(initialQuickHighlights)
  );
  const [trustQuestions, setTrustQuestions] = useState([]);
  const [trustAnswers, setTrustAnswers] = useState({});
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateQuickHighlight = (index, value) => {
    setQuickHighlights((prev) => {
      const next = [...prev];
      next[index] = String(value || "").slice(0, 80);
      return next;
    });
  };

  useEffect(() => {
    if (!vendorId) return;

    let active = true;
    async function loadTrustDetails() {
      try {
        setLoadingTrust(true);
        const query = new URLSearchParams();
        if (categoryId) query.set("categoryId", String(categoryId));
        if (categoryName) query.set("category", String(categoryName));

        const [questionsRes, answersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/trust/questions?${query.toString()}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/api/trust/vendor/${vendorId}`, {
            cache: "no-store",
          }),
        ]);

        const questionsData = await questionsRes.json().catch(() => ({}));
        const answersData = await answersRes.json().catch(() => ({}));

        if (!active) return;

        setTrustQuestions(Array.isArray(questionsData?.questions) ? questionsData.questions : []);
        setTrustAnswers(
          answersData?.answers && typeof answersData.answers === "object"
            ? answersData.answers
            : {}
        );
      } catch (error) {
        console.error("Failed to load trust details", error);
        if (!active) return;
        setTrustQuestions([]);
        setTrustAnswers({});
      } finally {
        if (active) setLoadingTrust(false);
      }
    }

    loadTrustDetails();
    return () => {
      active = false;
    };
  }, [vendorId, categoryId, categoryName]);

  const updateTrustAnswer = (questionId, value) => {
    setTrustAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const toggleTrustMultiSelect = (questionId, option) => {
    setTrustAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];

      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  const renderTrustInput = (question) => {
    const questionId = String(question?.id || "").trim();
    const questionType = String(question?.type || "text").trim().toLowerCase();
    const value = trustAnswers?.[questionId];
    const options = Array.isArray(question?.options) ? question.options : [];

    if (!questionId) return null;

    if (questionType === "years") {
      const yearOptions = options.length
        ? options
        : Array.from({ length: 51 }, (_, index) => String(index));

      return (
        <select
          className="branding-text-input"
          value={normalizeText(value)}
          onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
        >
          <option value="">Select years</option>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {options.length
                ? option
                : `${option} ${option === "1" ? "year" : "years"}`}
            </option>
          ))}
        </select>
      );
    }

    if (questionType === "range") {
      const rangeOptions = options.length
        ? options
        : Array.from({ length: 20 }, (_, index) => String(index + 1));

      return (
        <select
          className="branding-text-input"
          value={normalizeText(value)}
          onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
        >
          <option value="">Select minimum count</option>
          {rangeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (questionType === "select") {
      return (
        <select
          className="branding-text-input"
          value={normalizeText(value)}
          onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (questionType === "multi_select") {
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="branding-trust-multi-options">
          {options.map((option) => (
            <label key={option} className="branding-trust-multi-row">
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => toggleTrustMultiSelect(questionId, option)}
              />
              <span className="branding-trust-multi-text">{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (questionType === "boolean") {
      return (
        <select
          className="branding-text-input"
          value={normalizeText(value)}
          onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      );
    }

    if (questionType === "text") {
      return (
        <textarea
          className="branding-textarea-input"
          placeholder={question.placeholder || "Enter value"}
          value={normalizeText(value)}
          onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
          rows={3}
        />
      );
    }

    return (
      <input
        className="branding-text-input"
        type={questionType === "number" ? "number" : "text"}
        min={questionType === "number" ? "0" : undefined}
        placeholder={question.placeholder || "Enter value"}
        value={normalizeText(value)}
        onChange={(event) => updateTrustAnswer(questionId, event.target.value)}
      />
    );
  };

  const handleSave = async () => {
    if (!vendorId) {
      alert("Vendor ID missing");
      return;
    }

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "";

    const payload = {
      freeText1: normalizeText(heading),
      freeText2: normalizeText(description),
      quickHighlights: quickHighlights
        .map((item) => String(item || "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 3),
    };

    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE_URL}/api/dummy-vendors/${vendorId}/custom-fields`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save hero text");
      }

      if (trustQuestions.length > 0 && (categoryId || categoryName)) {
        const trustResponse = await fetch(`${API_BASE_URL}/api/trust/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            ...(categoryId ? { categoryId } : {}),
            ...(categoryName ? { category: categoryName } : {}),
            answers: trustAnswers,
          }),
        });

        const trustData = await trustResponse.json().catch(() => ({}));
        if (!trustResponse.ok || trustData?.success === false) {
          throw new Error(trustData?.message || "Failed to save trust summary");
        }
      }

      const vendorRefreshResponse = await fetch(
        `${API_BASE_URL}/api/dummy-vendors/${vendorId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        }
      );
      const refreshedVendor = await vendorRefreshResponse.json().catch(() => null);

      const nextCustomFields = {
        freeText1: payload.freeText1,
        freeText2: payload.freeText2,
        quickHighlights: payload.quickHighlights,
        ...(data?.customFields || {}),
      };

      setVendorInfo((prev) =>
        prev
          ? {
              ...prev,
              ...(refreshedVendor && typeof refreshedVendor === "object" ? refreshedVendor : {}),
              customFields: {
                ...(prev.customFields || {}),
                ...(refreshedVendor?.customFields || {}),
                ...nextCustomFields,
              },
            }
          : prev
      );

      onClose?.();
    } catch (error) {
      console.error("Failed to save hero text", error);
      alert(error.message || "Failed to save hero text");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card business-hours-theme branding-contact-theme">
        <h2 className="popup-title">Hero Text</h2>
        <p className="popup-subtitle">{businessName}</p>

        <div className="branding-contact-body">
          <div className="branding-contact-grid">
            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="hero-heading">
                Heading
              </label>
              <input
                id="hero-heading"
                className="branding-text-input"
                type="text"
                placeholder="Enter hero heading"
                value={heading}
                onChange={(event) => setHeading(event.target.value)}
              />
            </div>

            <div className="branding-contact-section">
              <label className="branding-label" htmlFor="hero-description">
                Description
              </label>
              <textarea
                id="hero-description"
                className="branding-textarea-input"
                placeholder="Enter hero description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
              />
            </div>

            <div className="branding-contact-section">
              <label className="branding-label">Quick Highlights</label>
              <div className="branding-helper-text">
                Common profile field. Only Modern Light preview shows this right now. Up to 3 bullet points, 80 characters each.
              </div>
              <div className="branding-quick-highlights">
                {quickHighlights.map((item, index) => (
                  <div key={`quick-highlight-${index}`} className="branding-quick-highlight-row">
                    <label className="branding-sub-label" htmlFor={`quick-highlight-${index}`}>
                      Bullet Point {index + 1}
                    </label>
                    <input
                      id={`quick-highlight-${index}`}
                      className="branding-text-input"
                      type="text"
                      maxLength={80}
                      placeholder={`Enter highlight ${index + 1}`}
                      value={item}
                      onChange={(event) => updateQuickHighlight(index, event.target.value)}
                    />
                    <div className="branding-helper-text">
                      {item.trim().length}/80 characters
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="branding-contact-section">
              <label className="branding-label">Trust Summary Questions</label>
              {loadingTrust ? (
                <div className="branding-helper-text">Loading trust summary questions...</div>
              ) : trustQuestions.length === 0 ? (
                <div className="branding-helper-text">No trust summary questions configured for this category.</div>
              ) : (
                <div className="branding-trust-grid">
                  {trustQuestions.map((question) => (
                    <div key={question.id} className="branding-contact-section nested">
                      <label className="branding-label">{humanizeTrustLabel(question)}</label>
                      {question.helperText ? (
                        <div className="branding-helper-text">{question.helperText}</div>
                      ) : null}
                      {renderTrustInput(question)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="popup-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-save primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Text"}
          </button>
        </div>
      </div>
    </div>
  );
}
