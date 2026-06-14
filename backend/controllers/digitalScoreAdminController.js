const DigitalScoreConfig = require("../models/DigitalScoreConfig");
const DigitalScoreQuestion = require("../models/DigitalScoreQuestion");
const DigitalScoreSubmission = require("../models/DigitalScoreSubmission");
const { DEFAULT_SCORE_RANGES, ensureDigitalScoreDefaults } = require("../utils/digitalScoreDefaults");

function normalizeLanguageList(values) {
  if (!Array.isArray(values) || !values.length) return ["english"];
  const normalized = Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => ["english", "telugu", "hindi"].includes(value))
    )
  );
  return normalized.length ? normalized : ["english"];
}

function normalizeLocalizedText(value = {}) {
  return {
    english: String(value?.english || "").trim(),
    telugu: String(value?.telugu || "").trim(),
    hindi: String(value?.hindi || "").trim(),
  };
}

function normalizeScoreRanges(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return DEFAULT_SCORE_RANGES;
  return ranges
    .map((range) => ({
      min: Number(range?.min),
      max: Number(range?.max),
      key: String(range?.key || "").trim().toLowerCase(),
      label: normalizeLocalizedText(range?.label || {}),
    }))
    .filter((range) => Number.isFinite(range.min) && Number.isFinite(range.max) && range.key);
}

function normalizeQuestionPayload(body = {}) {
  return {
    key: String(body.key || "").trim(),
    questionText: normalizeLocalizedText(body.questionText || {}),
    options: Array.isArray(body.options)
      ? body.options
          .map((option, index) => ({
            key: String(option?.key || "").trim(),
            label: normalizeLocalizedText(option?.label || {}),
            scoreValue: Number(option?.scoreValue || 0),
            order:
              Number.isFinite(Number(option?.order)) && option?.order !== ""
                ? Number(option.order)
                : index + 1,
            isActive: option?.isActive !== false,
          }))
          .filter((option) => option.key)
      : [],
    order:
      Number.isFinite(Number(body.order)) && body.order !== ""
        ? Number(body.order)
        : 0,
    categoryApplicability: Array.isArray(body.categoryApplicability)
      ? body.categoryApplicability
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [],
    isActive: body.isActive !== false,
    questionType: "single_choice",
    section: String(body.section || "").trim(),
  };
}

exports.getDigitalScoreAdminConfig = async (req, res) => {
  try {
    await ensureDigitalScoreDefaults();
    const config = await DigitalScoreConfig.findOne({ key: "digital-score" }).lean();
    return res.json({ success: true, data: config });
  } catch (err) {
    console.error("getDigitalScoreAdminConfig error:", err);
    return res.status(500).json({ success: false, message: "Failed to load config" });
  }
};

exports.updateDigitalScoreAdminConfig = async (req, res) => {
  try {
    await ensureDigitalScoreDefaults();
    const supportedLanguages = normalizeLanguageList(req.body?.supportedLanguages);
    const defaultLanguage = supportedLanguages.includes(
      String(req.body?.defaultLanguage || "").trim().toLowerCase()
    )
      ? String(req.body.defaultLanguage).trim().toLowerCase()
      : supportedLanguages[0];

    const payload = {
      isEnabled: req.body?.isEnabled !== false,
      supportedLanguages,
      defaultLanguage,
      title: normalizeLocalizedText(req.body?.title || {}),
      subtitle: normalizeLocalizedText(req.body?.subtitle || {}),
      ctaText: normalizeLocalizedText(req.body?.ctaText || {}),
      resultScreenText: normalizeLocalizedText(req.body?.resultScreenText || {}),
      scoreRanges: normalizeScoreRanges(req.body?.scoreRanges),
    };

    const config = await DigitalScoreConfig.findOneAndUpdate(
      { key: "digital-score" },
      { $set: payload },
      { new: true, runValidators: true }
    );

    return res.json({ success: true, data: config });
  } catch (err) {
    console.error("updateDigitalScoreAdminConfig error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update config" });
  }
};

exports.listDigitalScoreQuestions = async (req, res) => {
  try {
    await ensureDigitalScoreDefaults();
    const docs = await DigitalScoreQuestion.find({})
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error("listDigitalScoreQuestions error:", err);
    return res.status(500).json({ success: false, message: "Failed to load questions" });
  }
};

exports.createDigitalScoreQuestion = async (req, res) => {
  try {
    const payload = normalizeQuestionPayload(req.body || {});

    if (!payload.key || !payload.section || !payload.options.length) {
      return res.status(400).json({
        success: false,
        message: "key, section, and at least one option are required",
      });
    }

    const doc = await DigitalScoreQuestion.create(payload);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("createDigitalScoreQuestion error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create question" });
  }
};

exports.updateDigitalScoreQuestion = async (req, res) => {
  try {
    const payload = normalizeQuestionPayload(req.body || {});
    if (!payload.key || !payload.section || !payload.options.length) {
      return res.status(400).json({
        success: false,
        message: "key, section, and at least one option are required",
      });
    }

    const doc = await DigitalScoreQuestion.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("updateDigitalScoreQuestion error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update question" });
  }
};

exports.deleteDigitalScoreQuestion = async (req, res) => {
  try {
    const doc = await DigitalScoreQuestion.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteDigitalScoreQuestion error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete question" });
  }
};

exports.listDigitalScoreSubmissions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
    const search = String(req.query.search || "").trim();
    const mobile = String(req.query.mobile || "").trim();
    const category = String(req.query.category || "").trim();
    const city = String(req.query.city || "").trim();
    const language = String(req.query.language || "").trim().toLowerCase();

    const query = {};

    if (mobile) query.mobileNumber = new RegExp(mobile, "i");
    if (category) query.category = new RegExp(`^${category}$`, "i");
    if (city) query.city = new RegExp(city, "i");
    if (["english", "telugu", "hindi"].includes(language)) {
      query.selectedLanguage = language;
    }
    if (search) {
      query.$or = [
        { businessName: new RegExp(search, "i") },
        { mobileNumber: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { category: new RegExp(search, "i") },
      ];
    }

    const [total, items, summaryBase] = await Promise.all([
      DigitalScoreSubmission.countDocuments(query),
      DigitalScoreSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DigitalScoreSubmission.find(query)
        .select("category selectedLanguage totalScore")
        .lean(),
    ]);

    const byCategory = {};
    const byLanguage = {};
    let scoreTotal = 0;
    for (const item of summaryBase) {
      const categoryKey = item.category || "Unknown";
      const languageKey = item.selectedLanguage || "unknown";
      byCategory[categoryKey] = (byCategory[categoryKey] || 0) + 1;
      byLanguage[languageKey] = (byLanguage[languageKey] || 0) + 1;
      scoreTotal += Number(item.totalScore || 0);
    }

    const averageScore = summaryBase.length
      ? Math.round((scoreTotal / summaryBase.length) * 10) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        summary: {
          totalSubmissions: summaryBase.length,
          averageScore,
          submissionsByCategory: byCategory,
          submissionsByLanguage: byLanguage,
        },
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (err) {
    console.error("listDigitalScoreSubmissions error:", err);
    return res.status(500).json({ success: false, message: "Failed to load submissions" });
  }
};
