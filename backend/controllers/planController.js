const Plan = require("../models/Plan");

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({}).sort({ price: 1 }).lean();
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("Get plans error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch plans",
    });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    return res.json({ success: true, data: plan });
  } catch (err) {
    console.error("Create plan error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create plan",
    });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Plan.findByIdAndUpdate(id, req.body, { new: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update plan error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update plan",
    });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await Plan.findByIdAndDelete(id);
    return res.json({ success: true, message: "Plan deleted" });
  } catch (err) {
    console.error("Delete plan error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete plan",
    });
  }
};
