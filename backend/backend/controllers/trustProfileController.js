const VendorTrustProfile = require("../models/VendorTrustProfile");
const DummyVendor = require("../models/DummyVendor");
const { CATEGORY_CLUSTER_MAP, CLUSTER_QUESTIONS } = require("../utils/trustClusters");

function getCluster(category) {
  if (!category) return null;
  return CATEGORY_CLUSTER_MAP[category] || null;
}

function normalizeAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  return answers;
}

// 1) Get trust questions for a category
exports.getTrustQuestions = async (req, res) => {
  try {
    const category = String(req.query.category || "").trim();
    const cluster = getCluster(category);
    const questions = cluster ? CLUSTER_QUESTIONS[cluster] || [] : [];

    return res.status(200).json({
      cluster,
      questions,
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
    const { vendorId, category, answers } = req.body || {};

    console.log("🔥 TRUST ANSWERS RECEIVED:", answers);

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required" });
    }

    const cluster = getCluster(String(category || "").trim());
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

    // ✅ Copy numeric answers dynamically (future-proof)
    Object.entries(updated.answers || {}).forEach(([key, value]) => {
      // ❌ Skip duplicate experience field
      if (key === "experience") return;

      const num = Number(value);

      if (!isNaN(num) && value !== "" && value !== null) {
        trustSummary[key] = num;
      }
    });

    // ⭐ Save summary into vendor doc
    await DummyVendor.findByIdAndUpdate(
      vendorId,
      { $set: { trustSummary } },
      { new: true }
    );

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