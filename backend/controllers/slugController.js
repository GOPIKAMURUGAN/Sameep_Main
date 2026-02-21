const { generateSlugSuggestions } = require("../utils/slugGenerator");

exports.suggestSlugs = async (req, res) => {
  try {
    const { businessName, category, city, locality } = req.body || {};

    if (!businessName) {
      return res.status(400).json({
        success: false,
        message: "businessName is required",
      });
    }

    const slugs = generateSlugSuggestions({ businessName, category, city, locality });

    return res.json({
      success: true,
      slugs,
    });
  } catch (err) {
    console.error("suggestSlugs error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate slugs",
    });
  }
};
