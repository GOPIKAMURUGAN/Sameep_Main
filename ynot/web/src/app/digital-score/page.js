"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCategories,
  getDigitalScorePublicConfig,
  getDigitalScoreQuestions,
  submitDigitalScore,
} from "../../services/api";

const LANGUAGE_LABELS = {
  english: "English",
  telugu: "Telugu",
  hindi: "Hindi",
};

const SECTION_LABELS = {
  Discovery: "Discovery",
  Trust: "Trust",
  Information: "Information",
  Conversion: "Conversion",
  Retention: "Retention",
};

const STEPS = ["language", "category", "questions", "details", "result"];

function isValidMobile(value) {
  return /^\d{10}$/.test(String(value || "").trim());
}

function getResultTone(level) {
  switch (String(level || "").toLowerCase()) {
    case "excellent":
      return "excellent";
    case "good":
      return "good";
    case "average":
      return "average";
    default:
      return "poor";
  }
}

function getSectionScoreMap(result) {
  return [
    { key: "discoveryScore", label: SECTION_LABELS.Discovery, value: result?.discoveryScore ?? 0 },
    { key: "trustScore", label: SECTION_LABELS.Trust, value: result?.trustScore ?? 0 },
    { key: "informationScore", label: SECTION_LABELS.Information, value: result?.informationScore ?? 0 },
    { key: "conversionScore", label: SECTION_LABELS.Conversion, value: result?.conversionScore ?? 0 },
    { key: "retentionScore", label: SECTION_LABELS.Retention, value: result?.retentionScore ?? 0 },
  ];
}

export default function DigitalScorePage() {
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [details, setDetails] = useState({
    businessName: "",
    mobileNumber: "",
    city: "",
  });
  const [result, setResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");
        const [configData, categoryData] = await Promise.all([
          getDigitalScorePublicConfig(),
          getCategories(),
        ]);

        if (!isMounted) return;

        setConfig(configData);
        setSelectedLanguage(configData?.defaultLanguage || "english");
        setCategories(
          (Array.isArray(categoryData) ? categoryData : []).filter(
            (category) =>
              category?.onboardingEnabled !== false &&
              category?.visibleToVendor !== false
          )
        );
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load the Digital Score flow right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      if (!selectedCategory?.name) return;
      try {
        setQuestionLoading(true);
        setError("");
        const questionData = await getDigitalScoreQuestions({
          language: selectedLanguage,
          category: selectedCategory.name,
        });
        if (!isMounted) return;
        setQuestions(questionData);
        setAnswers({});
        setResult(null);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load questions for this category.");
        }
      } finally {
        if (isMounted) {
          setQuestionLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [selectedLanguage, selectedCategory]);

  const localizedTitle = config?.title || "Check Your Digital Score";
  const localizedSubtitle =
    config?.subtitle ||
    "Find out how discoverable and customer-ready your business is in under a minute.";
  const localizedCta = config?.ctaText || "Check Your Digital Score";
  const localizedResultText =
    result?.resultScreenText ||
    config?.resultScreenText ||
    "Your score is ready. Here are the easiest ways to improve your digital presence.";

  const questionProgress = useMemo(() => {
    const total = questions.length || 1;
    const answered = Object.keys(answers).length;
    return Math.min(100, Math.round((answered / total) * 100));
  }, [questions, answers]);

  const stepProgress = useMemo(() => {
    if (currentStep === "questions") return 40 + Math.round(questionProgress * 0.4);
    return Math.round(((stepIndex + 1) / STEPS.length) * 100);
  }, [currentStep, questionProgress, stepIndex]);

  const canMoveToQuestions = Boolean(selectedCategory?.name) && questions.length > 0;
  const canMoveToDetails =
    questions.length > 0 &&
    questions.every((question) => Boolean(answers[question.key]));
  const canSubmit =
    details.businessName.trim() &&
    details.city.trim() &&
    isValidMobile(details.mobileNumber) &&
    canMoveToDetails;

  const handleOptionSelect = (questionKey, optionKey) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: optionKey,
    }));
  };

  const handleDetailChange = (field, value) => {
    setDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const moveBack = () => {
    setError("");
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const moveForward = () => {
    setError("");
    if (currentStep === "language") {
      setStepIndex(1);
      return;
    }
    if (currentStep === "category") {
      if (!canMoveToQuestions) {
        setError("Please choose a category with active Digital Score questions.");
        return;
      }
      setStepIndex(2);
      return;
    }
    if (currentStep === "questions") {
      if (!canMoveToDetails) {
        setError("Please answer all the questions to continue.");
        return;
      }
      setStepIndex(3);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCategory?.name) {
      setError("Please complete all the required details before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const submissionResult = await submitDigitalScore({
        businessName: details.businessName.trim(),
        mobileNumber: details.mobileNumber.trim(),
        city: details.city.trim(),
        category: selectedCategory.name,
        selectedLanguage,
        answers: questions.map((question) => ({
          questionKey: question.key,
          selectedOptionKey: answers[question.key],
        })),
      });

      setResult(submissionResult);
      setStepIndex(4);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit your Digital Score.");
    } finally {
      setSubmitting(false);
    }
  };

  const startOnboardingFromResult = () => {
    const categoryId = selectedCategory?._id || selectedCategory?.id || "";
    const base = "/onboarding";
    router.push(categoryId ? `${base}?categoryId=${categoryId}` : base);
  };

  if (loading) {
    return (
      <main className="digitalScorePage">
        <div className="digitalScoreShell">
          <div className="digitalScoreCard digitalScoreStateCard">
            <div className="digitalScoreSpinner" />
            <p>Loading your Digital Score journey...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !config) {
    return (
      <main className="digitalScorePage">
        <div className="digitalScoreShell">
          <div className="digitalScoreCard digitalScoreStateCard">
            <h1>{localizedTitle}</h1>
            <p>{error}</p>
            <button
              type="button"
              className="digitalScorePrimaryButton"
              onClick={() => router.push("/")}
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!config?.isEnabled) {
    return (
      <main className="digitalScorePage">
        <div className="digitalScoreShell">
          <div className="digitalScoreCard digitalScoreStateCard">
            <h1>{localizedTitle}</h1>
            <p>Digital Score is not live right now. Please check back shortly.</p>
            <button
              type="button"
              className="digitalScorePrimaryButton"
              onClick={() => router.push("/")}
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="digitalScorePage">
      <div className="digitalScoreShell">
        <button
          type="button"
          className="digitalScoreBackLink"
          onClick={() => router.push("/")}
        >
          Back to YNOT Home
        </button>

        <section className="digitalScoreHero">
          <div>
            <span className="digitalScoreEyebrow">Digital Score</span>
            <h1>{localizedTitle}</h1>
            <p>{localizedSubtitle}</p>
          </div>
          <div className="digitalScoreHeroMeta">
            <strong>{stepProgress}%</strong>
            <span>Progress</span>
          </div>
        </section>

        <section className="digitalScoreProgressWrap">
          <div className="digitalScoreProgressTrack">
            <span
              className="digitalScoreProgressFill"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <div className="digitalScoreProgressSteps">
            {STEPS.map((step, index) => (
              <span
                key={step}
                className={index <= stepIndex ? "is-active" : ""}
              >
                {step}
              </span>
            ))}
          </div>
        </section>

        <section className="digitalScoreCard">
          {currentStep !== "result" && (
            <div className="digitalScoreCardHeader">
              <div>
                <h2>
                  {currentStep === "language" && "Choose language"}
                  {currentStep === "category" && "Choose your business category"}
                  {currentStep === "questions" && "Answer 8 quick questions"}
                  {currentStep === "details" && "Tell us about your business"}
                </h2>
                <p>
                  {currentStep === "language" &&
                    "Pick the language you are most comfortable with."}
                  {currentStep === "category" &&
                    "We will tailor the questions to your business type."}
                  {currentStep === "questions" &&
                    "This takes less than a minute. Choose the closest answer each time."}
                  {currentStep === "details" &&
                    "We will save your Digital Score so you can improve it later."}
                </p>
              </div>
              {(currentStep === "category" || currentStep === "questions" || currentStep === "details") && (
                <button
                  type="button"
                  className="digitalScoreSecondaryButton"
                  onClick={moveBack}
                >
                  Back
                </button>
              )}
            </div>
          )}

          {error ? <p className="digitalScoreError">{error}</p> : null}

          {currentStep === "language" && (
            <div className="digitalScoreLanguageGrid">
              {(config.supportedLanguages || ["english"]).map((language) => (
                <button
                  key={language}
                  type="button"
                  className={`digitalScoreChoiceCard ${
                    selectedLanguage === language ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedLanguage(language)}
                >
                  <strong>{LANGUAGE_LABELS[language] || language}</strong>
                  <span>{selectedLanguage === language ? "Selected" : "Tap to choose"}</span>
                </button>
              ))}
            </div>
          )}

          {currentStep === "category" && (
            <>
              {questionLoading ? (
                <div className="digitalScoreInlineLoading">
                  <div className="digitalScoreSpinner small" />
                  <p>Loading questions for your category...</p>
                </div>
              ) : null}
              <div className="digitalScoreCategoryGrid">
                {categories.map((category) => {
                  const isSelected =
                    (selectedCategory?._id || selectedCategory?.id) ===
                    (category?._id || category?.id);
                  return (
                    <button
                      key={category?._id || category?.id || category?.name}
                      type="button"
                      className={`digitalScoreChoiceCard ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <strong>{category?.name || "Unnamed category"}</strong>
                      <span>
                        {(category?.vendorCount || category?.totalVendors || 0) > 0
                          ? `${category?.vendorCount || category?.totalVendors || 0}+ vendors`
                          : "Digital Score ready"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {currentStep === "questions" && (
            <div className="digitalScoreQuestionList">
              {questions.map((question, index) => (
                <article className="digitalScoreQuestionCard" key={question.key}>
                  <div className="digitalScoreQuestionMeta">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <small>{SECTION_LABELS[question.section] || question.section}</small>
                  </div>
                  <h3>{question.questionText}</h3>
                  <div className="digitalScoreOptionGrid">
                    {(question.options || []).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`digitalScoreOptionButton ${
                          answers[question.key] === option.key ? "is-selected" : ""
                        }`}
                        onClick={() => handleOptionSelect(question.key, option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {currentStep === "details" && (
            <div className="digitalScoreDetailsGrid">
              <label className="digitalScoreField">
                <span>Business name</span>
                <input
                  type="text"
                  value={details.businessName}
                  onChange={(event) =>
                    handleDetailChange("businessName", event.target.value)
                  }
                  placeholder="Enter your business name"
                />
              </label>
              <label className="digitalScoreField">
                <span>Mobile number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={details.mobileNumber}
                  onChange={(event) =>
                    handleDetailChange(
                      "mobileNumber",
                      event.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  placeholder="Enter 10-digit mobile number"
                />
              </label>
              <label className="digitalScoreField digitalScoreFieldFull">
                <span>City</span>
                <input
                  type="text"
                  value={details.city}
                  onChange={(event) => handleDetailChange("city", event.target.value)}
                  placeholder="Enter your city"
                />
              </label>
            </div>
          )}

          {currentStep === "result" && result && (
            <div className={`digitalScoreResult ${getResultTone(result.resultLevel)}`}>
              <div className="digitalScoreResultHero">
                <div>
                  <span className="digitalScoreEyebrow">Your result</span>
                  <h2>{result.resultLevel}</h2>
                  <p>{localizedResultText}</p>
                </div>
                <div className="digitalScoreResultScore">
                  <strong>{result.totalScore}</strong>
                  <span>/ 100</span>
                </div>
              </div>

              <div className="digitalScoreSectionGrid">
                {getSectionScoreMap(result).map((section) => (
                  <div key={section.key} className="digitalScoreSectionCard">
                    <span>{section.label}</span>
                    <strong>{section.value}</strong>
                  </div>
                ))}
              </div>

              <div className="digitalScoreRecommendationCard">
                <h3>Missing opportunities</h3>
                {Array.isArray(result.recommendations) && result.recommendations.length ? (
                  <ul>
                    {result.recommendations.map((recommendation, index) => (
                      <li key={`${recommendation}-${index}`}>{recommendation}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Your business is already doing well. Keep your online presence updated.</p>
                )}
              </div>

              <div className="digitalScoreResultActions">
                <button
                  type="button"
                  className="digitalScoreSecondaryButton"
                  onClick={() => {
                    setStepIndex(0);
                    setSelectedCategory(null);
                    setQuestions([]);
                    setAnswers({});
                    setDetails({
                      businessName: "",
                      mobileNumber: "",
                      city: "",
                    });
                    setResult(null);
                    setError("");
                  }}
                >
                  Retake score
                </button>
                <button
                  type="button"
                  className="digitalScorePrimaryButton"
                  onClick={startOnboardingFromResult}
                >
                  Improve My Score with Ynot
                </button>
              </div>
            </div>
          )}

          {currentStep !== "result" && (
            <div className="digitalScoreFooterActions">
              {currentStep === "language" && (
                <button
                  type="button"
                  className="digitalScorePrimaryButton"
                  onClick={moveForward}
                >
                  Continue
                </button>
              )}
              {currentStep === "category" && (
                <button
                  type="button"
                  className="digitalScorePrimaryButton"
                  onClick={moveForward}
                  disabled={!selectedCategory || questionLoading}
                >
                  Start questions
                </button>
              )}
              {currentStep === "questions" && (
                <button
                  type="button"
                  className="digitalScorePrimaryButton"
                  onClick={moveForward}
                  disabled={!canMoveToDetails}
                >
                  Continue
                </button>
              )}
              {currentStep === "details" && (
                <button
                  type="button"
                  className="digitalScorePrimaryButton"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "Calculating..." : localizedCta}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
