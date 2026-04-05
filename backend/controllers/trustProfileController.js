const VendorTrustProfile = require("../models/VendorTrustProfile");
const DummyVendor = require("../models/DummyVendor");
const TrustQuestionnaireConfig = require("../models/TrustQuestionnaireConfig");
const { CATEGORY_CLUSTER_MAP, CLUSTER_QUESTIONS } = require("../utils/trustClusters");

function getCluster(category) {
  if (!category) return null;
  return CATEGORY_CLUSTER_MAP[category] || null;
}

async function findClusterConfig({ category, categoryId } = {}) {
  const cleanCategory = String(category || "").trim();
  const cleanCategoryId = String(categoryId || "").trim();

  const or = [];
  if (cleanCategoryId) or.push({ categoryIds: cleanCategoryId });
  if (cleanCategory) or.push({ categoryNames: cleanCategory });

  let config = null;
  if (or.length > 0) {
    config = await TrustQuestionnaireConfig.findOne({
      isActive: true,
      $or: or,
    }).lean();
  }

  if (!config && cleanCategory) {
    const clusterKey = getCluster(cleanCategory);
    if (clusterKey) {
      config = await TrustQuestionnaireConfig.findOne({
        clusterKey,
        isActive: true,
      }).lean();
    }
  }

  if (!config) return null;

  const questions = Array.isArray(config.questions)
    ? config.questions
        .filter((question) => question && question.isActive !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  return {
    clusterKey: config.clusterKey,
    questions,
  };
}

function normalizeAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  return answers;
}

function pickTrustValue(trustSummary = {}, matcher) {
  const entry = Object.entries(trustSummary).find(([key, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return false;
    return matcher.test(String(key));
  });
  return entry ? entry[1] : "";
}

// 1) Get trust questions for a category
exports.getTrustQuestions = async (req, res) => {
  try {
    const category = String(req.query.category || "").trim();
    const categoryId = String(req.query.categoryId || "").trim();
    const config = await findClusterConfig({ category, categoryId });

    if (config) {
      return res.status(200).json({
        cluster: config.clusterKey,
        questions: config.questions,
        source: "db",
      });
    }

    const cluster = getCluster(category);
    const questions = cluster ? CLUSTER_QUESTIONS[cluster] || [] : [];

    return res.status(200).json({
      cluster,
      questions,
      source: "file",
    });
  } catch (err) {
    console.error("getTrustQuestions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load trust questions",
    });
  }
};

// 2) Save trust profile
exports.saveTrustProfile = async (req, res) => {
  try {
    const { vendorId, category, categoryId, answers } = req.body || {};

    console.log("🔥 TRUST ANSWERS RECEIVED:", answers);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required" });
    }

    const config = await findClusterConfig({ category, categoryId });
    const cluster = config?.clusterKey || getCluster(String(category || "").trim());
    if (!cluster) {
      return res.status(400).json({ success: false, message: "Unknown category cluster" });
    }

    const a = normalizeAnswers(answers);

    // ⭐ Convert experience → start year
    const baseYear = new Date().getFullYear();
    const experienceYearsInput = Number(a.experience || 0);
    const experienceStartYear =
      experienceYearsInput > 0 ? baseYear - experienceYearsInput : undefined;

    const payload = {
      vendorId,
      answers: a,
      ...(experienceStartYear ? { experienceStartYear } : {}),
    };

    const updated = await VendorTrustProfile.findOneAndUpdate(
      { vendorId },
      { $set: payload },
      { new: true, upsert: true }
    );

    if (!updated.answers) updated.answers = {};

    // ⭐ Build denormalized trust summary (for fast reads)
    const trustSummary = {};

    // ✅ Derived field (ONLY source of truth for experience)
    if (updated.experienceStartYear) {
      const nowYear = new Date().getFullYear();
      trustSummary.experienceYears = nowYear - updated.experienceStartYear;
    }

    // ✅ Copy questionnaire answers dynamically.
    // Preserve labeled range/select values like "5000+" instead of dropping them.
    Object.entries(updated.answers || {}).forEach(([key, value]) => {
      // ❌ Skip duplicate experience field
      if (key === "experience") return;

      const num = Number(value);

      if (!isNaN(num) && value !== "" && value !== null) {
        trustSummary[key] = num;
      } else if (Array.isArray(value)) {
        const cleaned = value
          .map((item) => String(item || "").trim())
          .filter(Boolean);
        if (cleaned.length > 0) trustSummary[key] = cleaned;
      } else if (typeof value === "string" && value.trim() !== "") {
        trustSummary[key] = value.trim();
      }
    });

    const vendor = await DummyVendor.findById(vendorId);
    if (vendor) {
      const years = trustSummary.experienceYears || pickTrustValue(trustSummary, /experience/i);
      const customers =
        pickTrustValue(trustSummary, /(customer|customers|students|pets|clients|served)/i) || "";
      const rating = vendor.googlePlace?.rating || "";
      const areas = (vendor.serviceAreas?.targetAreas || []).slice(0, 3).join(", ");
      const cityLabel = vendor.serviceAreas?.city || "";

      const nextCustomFields = {
        ...(vendor.customFields || {}),
      };

      if (!String(nextCustomFields.freeText1 || "").trim()) {
        nextCustomFields.freeText1 = `${cityLabel || "Local"} Services`;
      }

      const yearsText = String(years || "").trim();
      const normalizedYearsText = yearsText
        ? yearsText.endsWith("+")
          ? yearsText
          : `${yearsText}+`
        : "";

      nextCustomFields.freeText2 = `Trusted by ${customers || "many"} clients${
        normalizedYearsText ? ` with ${normalizedYearsText} years of experience` : ""
      }, ${vendor.businessName} offers premium services in ${cityLabel || "your area"}${
        areas ? ` including ${areas}` : ""
      }. ${rating ? `Rated ${rating}★ on Google,` : ""} we deliver personalised experiences tailored for every customer.`
        .replace(/\s+/g, " ")
        .trim();

      vendor.trustSummary = trustSummary;
      vendor.customFields = nextCustomFields;
      await vendor.save();
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("saveTrustProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save trust profile",
    });
  }
};

// 3) Get vendor trust profile
exports.getVendorTrustProfile = async (req, res) => {
  try {
    const { vendorId } = req.params || {};

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required" });
    }

    const doc = await VendorTrustProfile.findOne({ vendorId }).lean();

    if (!doc) {
      return res.status(200).json({
        answers: {},
      });
    }

    return res.status(200).json({
      answers: doc.answers || {},
    });
  } catch (err) {
    console.error("getVendorTrustProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load trust profile",
    });
  }
};
