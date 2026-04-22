const express = require("express");
const mongoose = require("mongoose");

const DummyCategory = require("../models/dummyCategory");
const DummySubcategory = require("../models/dummySubcategory");

const router = express.Router();

function normalizeSearch(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(item, query) {
  if (!query) return true;

  const compactQuery = query.replace(/\s+/g, "");
  const haystack = normalizeSearch([item.name, item.pathLabel].filter(Boolean).join(" "));
  const compactHaystack = haystack.replace(/\s+/g, "");
  const tokens = query
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  return (
    haystack.includes(query) ||
    compactHaystack.includes(compactQuery) ||
    tokens.some((token) => haystack.includes(token))
  );
}

function scoreSearch(item, query) {
  if (!query) return 0;

  const haystack = normalizeSearch([item.name, item.pathLabel].filter(Boolean).join(" "));
  const compactQuery = query.replace(/\s+/g, "");
  const compactHaystack = haystack.replace(/\s+/g, "");
  const tokens = query
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  let score = 0;
  if (haystack.includes(query)) score += 100;
  if (compactQuery && compactHaystack.includes(compactQuery)) score += 80;

  tokens.forEach((token) => {
    if (haystack.includes(token)) score += 20;
    if (normalizeSearch(item.name).includes(token)) score += 15;
  });

  return score;
}

router.get("/", async (req, res) => {
  try {
    const { rootCategoryId } = req.query;
    const query = normalizeSearch(req.query.q || "");

    if (!rootCategoryId || !mongoose.Types.ObjectId.isValid(rootCategoryId)) {
      return res.status(400).json({ message: "rootCategoryId is required" });
    }

    const root = await DummyCategory.findById(rootCategoryId, "name imageUrl").lean();
    if (!root) {
      return res.status(404).json({ message: "Root category not found" });
    }

    const subs = await DummySubcategory.find(
      { category: rootCategoryId },
      "name imageUrl parentSubcategory sequence"
    )
      .sort({ sequence: 1, name: 1 })
      .lean();

    const byId = new Map(subs.map((node) => [String(node._id), node]));

    function buildPath(node) {
      const path = [root.name];
      const parents = [];
      let current = node;
      const seen = new Set();

      while (current?.parentSubcategory) {
        const parentId = String(current.parentSubcategory);
        if (seen.has(parentId)) break;
        seen.add(parentId);
        const parent = byId.get(parentId);
        if (!parent) break;
        parents.unshift(parent.name);
        current = parent;
      }

      return [...path, ...parents, node.name].filter(Boolean);
    }

    const items = subs
      .filter((node) => String(node.imageUrl || "").trim())
      .map((node) => {
        const path = buildPath(node);
        return {
          id: String(node._id),
          name: node.name,
          imageUrl: String(node.imageUrl || "").trim(),
          path,
          pathLabel: path.join(" > "),
        };
      })
      .filter((item) => matchesSearch(item, query))
      .sort((a, b) => scoreSearch(b, query) - scoreSearch(a, query))
      .slice(0, 80);

    return res.json({
      rootCategoryId,
      total: items.length,
      items,
    });
  } catch (error) {
    console.error("menu image library error:", error);
    return res.status(500).json({ message: "Failed to load image library" });
  }
});

module.exports = router;
