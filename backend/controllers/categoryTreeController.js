const mongoose = require("mongoose");
const DummyCategory = require("../models/dummyCategory");
const DummySubcategory = require("../models/dummySubcategory");
const { buildTree } = require("../utils/treeBuilder");

exports.getCategoryTree = async (req, res) => {
  try {
    const { rootCategoryId, mode } = req.query;

    if (!rootCategoryId || !mongoose.Types.ObjectId.isValid(rootCategoryId)) {
      return res.status(400).json({ message: "rootCategoryId is required" });
    }

    const root = await DummyCategory.findById(rootCategoryId).lean();
    if (!root) {
      return res.status(404).json({ message: "Root category not found" });
    }

    const subs = await DummySubcategory.find({ category: rootCategoryId }).lean();
    const filterMode = ["user", "vendor", "admin"].includes(mode) ? mode : "admin";
    const { tree, flat } = buildTree(subs, { filterMode });

    return res.json({
      id: root._id,
      name: root.name,
      children: tree,
      flat,
    });
  } catch (err) {
    console.error("getCategoryTree error:", err);
    return res.status(500).json({ message: "Failed to build category tree" });
  }
};
