const DigitalScoreConfig = require("../models/DigitalScoreConfig");
const DigitalScoreQuestion = require("../models/DigitalScoreQuestion");
const DigitalScoreSubmission = require("../models/DigitalScoreSubmission");
const { ensureDigitalScoreDefaults } = require("../utils/digitalScoreDefaults");
const { calculateDigitalScore } = require("../utils/digitalScoreScoring");

function normalizeLanguage(language, fallback = "english") {
  const value = String(language || "").trim().toLowerCase();
  return ["english", "telugu", "hindi"].includes(value) ? value : fallback;
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function pickLocalizedText(value = {}, language = "english") {
  return value?.[language] || value?.english || "";
}

function isQuestionApplicable(question, category) {
  const categories = Array.isArray(question.categoryApplicability)
    ? question.categoryApplicability
        .map((item) => normalizeCategory(item))
        .filter(Boolean)
    : [];
  if (!categories.length) return true;
  return categories.includes(normalizeCategory(category));
}

async function getConfigDocument() {
  await ensureDigitalScoreDefaults();
  return DigitalScoreConfig.findOne({ key: "digital-score" }).lean();
}

async function getApplicableQuestions(category) {
  await ensureDigitalScoreDefaults();
  const questions = await DigitalScoreQuestion.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return questions.filter((question) => isQuestionApplicable(question, category));
}

function localizeQuestion(question, language) {
  return {
    id: question._id,
    key: question.key,
    order: question.order,
    section: question.section,
    questionType: question.questionType,
    questionText: pickLocalizedText(question.questionText, language),
    options: (question.options || [])
      .filter((option) => option.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((option) => ({
        key: option.key,
        label: pickLocalizedText(option.label, language),
        order: option.order || 0,
      })),
  };
}

exports.getPublicDigitalScoreConfig = async (req, res) => {
  try {
    const config = await getConfigDocument();
    const language = normalizeLanguage(req.query.language, config?.defaultLanguage || "english");

    return res.json({
      success: true,
      data: {
        isEnabled: config?.isEnabled === true,
        supportedLanguages: config?.supportedLanguages || ["english"],
        defaultLanguage: config?.defaultLanguage || "english",
        title: pickLocalizedText(config?.title, language),
        subtitle: pickLocalizedText(config?.subtitle, language),
        ctaText: pickLocalizedText(config?.ctaText, language),
        resultScreenText: pickLocalizedText(config?.resultScreenText, language),
        scoreRanges: (config?.scoreRanges || []).map((range) => ({
          min: range.min,
          max: range.max,
          key: range.key,
          label: pickLocalizedText(range.label, language),
        })),
      },
    });
  } catch (err) {
    console.error("getPublicDigitalScoreConfig error:", err);
    return res.status(500).json({ success: false, message: "Failed to load digital score config" });
  }
};

exports.getDigitalScoreQuestions = async (req, res) => {
  try {
    const config = await getConfigDocument();
    const language = normalizeLanguage(req.query.language, config?.defaultLanguage || "english");
    const category = String(req.query.category || "").trim();
    const questions = await getApplicableQuestions(category);

    return res.json({
      success: true,
      data: questions.map((question) => localizeQuestion(question, language)),
    });
  } catch (err) {
    console.error("getDigitalScoreQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to load digital score questions" });
  }
};

exports.submitDigitalScore = async (req, res) => {
  try {
    const {
      businessName,
      mobileNumber,
      city,
      category,
      selectedLanguage,
      answers,
    } = req.body || {};

    const normalizedBusinessName = String(businessName || "").trim();
    const normalizedMobile = String(mobileNumber || "").trim();
    const normalizedCity = String(city || "").trim();
    const normalizedCategory = String(category || "").trim();

    if (!normalizedBusinessName || !normalizedMobile || !normalizedCity || !normalizedCategory) {
      return res.status(400).json({
        success: false,
        message: "businessName, mobileNumber, city, and category are required",
      });
    }

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const config = await getConfigDocument();
    const language = normalizeLanguage(
      selectedLanguage,
      config?.defaultLanguage || "english"
    );

    const questionDocs = await getApplicableQuestions(normalizedCategory);
    if (!questionDocs.length) {
      return res.status(400).json({
        success: false,
        message: "No digital score questions are configured",
      });
    }

    const rawAnswers = Array.isArray(answers) ? answers : [];
    const answerMap = {};
    for (const answer of rawAnswers) {
      const questionKey = String(answer?.questionKey || answer?.key || "").trim();
      const selectedOptionKey = String(
        answer?.selectedOptionKey || answer?.optionKey || answer?.value || ""
      ).trim();
      if (questionKey && selectedOptionKey) {
        answerMap[questionKey] = selectedOptionKey;
      }
    }

    const scoring = calculateDigitalScore({
      questions: questionDocs,
      answerMap,
      scoreRanges: config?.scoreRanges || [],
      category: normalizedCategory,
      language,
    });

    const submission = await DigitalScoreSubmission.create({
      businessName: normalizedBusinessName,
      mobileNumber: normalizedMobile,
      city: normalizedCity,
      category: normalizedCategory,
      selectedLanguage: language,
      answers: scoring.answers,
      totalScore: scoring.totalScore,
      discoveryScore: scoring.discoveryScore,
      trustScore: scoring.trustScore,
      informationScore: scoring.informationScore,
      conversionScore: scoring.conversionScore,
      retentionScore: scoring.retentionScore,
      resultLevel: scoring.resultLevel,
      recommendations: scoring.recommendations,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: submission._id,
        totalScore: scoring.totalScore,
        resultLevel: scoring.resultLevel,
        discoveryScore: scoring.discoveryScore,
        trustScore: scoring.trustScore,
        informationScore: scoring.informationScore,
        conversionScore: scoring.conversionScore,
        retentionScore: scoring.retentionScore,
        recommendations: scoring.recommendations,
        resultScreenText: pickLocalizedText(config?.resultScreenText, language),
      },
    });
  } catch (err) {
    console.error("submitDigitalScore error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to submit digital score",
    });
  }
};
