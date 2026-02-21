function normalizeText(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function generateSubdomain({ businessName, categoryName }) {
  const base = normalizeText(businessName).slice(0, 12);
  const category = normalizeText(categoryName).slice(0, 8);

  if (!base) return null;

  // Try smart combinations
  return [
    base,
    base + category,
    category + base,
  ].filter(Boolean);
}

module.exports = { generateSubdomain };
