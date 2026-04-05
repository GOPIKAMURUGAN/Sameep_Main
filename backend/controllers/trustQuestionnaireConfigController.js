const TrustQuestionnaireConfig = require("../models/TrustQuestionnaireConfig");

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question, index) => ({
      id: String(question?.id || "").trim(),
      label: String(question?.label || question?.id || "").trim(),
      type: String(question?.type || "").trim(),
      options: normalizeStringList(question?.options || []),
      placeholder: String(question?.placeholder || "").trim(),
      helperText: String(question?.helperText || "").trim(),
      required: question?.required === true,
      order:
        Number.isFinite(Number(question?.order)) && question?.order !== ""
          ? Number(question.order)
          : index,
      isActive: question?.isActive !== false,
    }))
    .filter((question) => question.id && question.type);
}

function buildPayload(body = {}) {
  return {
    clusterKey: String(body.clusterKey || "").trim(),
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    categoryIds: normalizeStringList(body.categoryIds || []),
    categoryNames: normalizeStringList(body.categoryNames || []),
    questions: normalizeQuestions(body.questions || []),
    isActive: body.isActive !== false,
  };
}

exports.listTrustQuestionnaireConfigs = async (req, res) => {
  try {
    const docs = await TrustQuestionnaireConfig.find({})
      .sort({ clusterKey: 1 })
      .lean();

    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error("listTrustQuestionnaireConfigs error:", err);
    return res.status(500).json({ success: false, message: "Failed to load configs" });
  }
};

exports.createTrustQuestionnaireConfig = async (req, res) => {
  try {
    const payload = buildPayload(req.body || {});

    if (!payload.clusterKey) {
      return res.status(400).json({ success: false, message: "clusterKey is required" });
    }

    const doc = await TrustQuestionnaireConfig.create(payload);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("createTrustQuestionnaireConfig error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create config" });
  }
};

exports.updateTrustQuestionnaireConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = buildPayload(req.body || {});

    if (!payload.clusterKey) {
      return res.status(400).json({ success: false, message: "clusterKey is required" });
    }

    const doc = await TrustQuestionnaireConfig.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: "Config not found" });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("updateTrustQuestionnaireConfig error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update config" });
  }
};

exports.deleteTrustQuestionnaireConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await TrustQuestionnaireConfig.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Config not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteTrustQuestionnaireConfig error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete config" });
  }
};
