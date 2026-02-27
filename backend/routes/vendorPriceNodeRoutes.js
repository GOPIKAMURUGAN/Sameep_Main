const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

const router = express.Router();

// Model (already loaded in server.js)
const VendorPriceNode = mongoose.model("VendorPriceNode");

/* =========================================================
   TEST ROUTE
========================================================= */
router.get("/_test", (req, res) => {
  res.json({ ok: true, message: "vendor-price-nodes router working" });
});

/* =========================================================
   🔥 HELPER: Build dynamic backend base URL (LOCAL + AWS SAFE)
========================================================= */
function getBackendBaseUrl(req) {
  const protocol =
    req.headers["x-forwarded-proto"] || req.protocol || "http";

  const host = req.headers["x-forwarded-host"] || req.get("host");

  return `${protocol}://${host}`;
}

/* =========================================================
   HELPER 1: Fetch category hierarchy from master (dummy)
   ✅ NO HARDCODED LOCALHOST
========================================================= */
async function fetchCategoryTree(categoryId, baseUrl) {
  const response = await axios.get(
    `${baseUrl}/api/dummy-categories?parentId=${categoryId}`
  );

  const children = response.data || [];
  const result = [];

  for (const child of children) {
    const node = {
      categoryId: child._id,
      name: child.name,
      price: child.price,
      offerText: child.offerText || "",
      terms: child.terms,
      
      children: [],
    };

    const subChildren = await fetchCategoryTree(
      child._id,
      baseUrl
    );

    if (subChildren.length > 0) {
      node.children = subChildren;
    }

    result.push(node);
  }

  return result;
}

/* =========================================================
   HELPER 2: Flatten hierarchy
========================================================= */
function flattenCategoryTree(
  nodes,
  parentCategoryId = null,
  level = 0,
  result = []
) {
  for (const node of nodes) {
    const isLeaf = !node.children || node.children.length === 0;

    result.push({
      categoryId: node.categoryId,
      name: node.name,
      parentCategoryId,
      level,
      isLeaf,
      price: node.price || null,
      terms: node.terms || "",
       offerText: node.offerText || "",
      
    });

    if (!isLeaf) {
      flattenCategoryTree(
        node.children,
        node.categoryId,
        level + 1,
        result
      );
    }
  }

  return result;
}

/* =========================================================
   HELPER 3: Pricing status logic
========================================================= */
function getPricingStatus(node, activeLeafCategoryIds = []) {
  if (!node.isLeaf) return "Inactive";

  return activeLeafCategoryIds.includes(
    String(node.categoryId)
  )
    ? "Active"
    : "Inactive";
}

/* =========================================================
   STEP 4: SYNC + AUTO LINK HIERARCHY
========================================================= */
router.post("/sync", async (req, res) => {
  try {
    const { vendorId, rootCategoryId, activeLeafCategoryIds = [] } =
      req.body;

    if (!vendorId || !rootCategoryId) {
      return res.status(400).json({
        message: "vendorId and rootCategoryId are required",
      });
    }

    // 🔥 Dynamic backend URL
    const baseUrl = getBackendBaseUrl(req);

    // Fetch hierarchy dynamically
    const tree = await fetchCategoryTree(
      rootCategoryId,
      baseUrl
    );

    const flatNodes = flattenCategoryTree(tree);

    const nodeMap = {};
    let created = 0;

    for (const node of flatNodes) {
      let record = await VendorPriceNode.findOne({
        vendorId,
        rootCategoryId,
        categoryId: node.categoryId,
      });

      if (!record) {
  record = await VendorPriceNode.create({
    vendorId,
    rootCategoryId,
    categoryId: node.categoryId,
    parentCategoryId: node.parentCategoryId,
    name: node.name,
    parentVendorPriceNodeId: null,
    level: node.level,
    isLeaf: node.isLeaf,
    price: node.isLeaf ? node.price : null,
    terms: node.terms,
    offerText: node.offerText || "",
 
    pricingStatus: getPricingStatus(node, activeLeafCategoryIds),
    source: "MASTER_SYNC",
  });

  created++;
} else {
  // ⭐⭐⭐ ADD THIS BLOCK ⭐⭐⭐
  record.offerText = node.offerText || "";
  record.terms = node.terms || "";
  if (record.isLeaf) record.price = node.price || null;

  await record.save();
}

      nodeMap[node.categoryId] = record;
    }

    // Auto-link parents
    for (const node of flatNodes) {
      if (!node.parentCategoryId) continue;

      const child = nodeMap[node.categoryId];
      const parent = nodeMap[node.parentCategoryId];

      if (
        child &&
        parent &&
        !child.parentVendorPriceNodeId
      ) {
        child.parentVendorPriceNodeId = parent._id;
        await child.save();
      }
    }

    return res.json({
      message:
        "Vendor pricing synced with auto-linked hierarchy",
      totalNodes: flatNodes.length,
      created,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

/* =========================================================
   STEP 9: READ HIERARCHY (TREE VIEW)
========================================================= */
router.get("/tree", async (req, res) => {
  try {
    const { vendorId, rootCategoryId } = req.query;

    if (!vendorId || !rootCategoryId) {
      return res.status(400).json({
        message: "vendorId and rootCategoryId are required",
      });
    }

    const nodes = await VendorPriceNode.find({
      vendorId,
      rootCategoryId,
    }).lean();

    const map = {};
    nodes.forEach((n) => {
      map[n._id] = { ...n, children: [] };
    });

    const tree = [];

    nodes.forEach((n) => {
      if (n.parentVendorPriceNodeId) {
        map[n.parentVendorPriceNodeId]?.children.push(
          map[n._id]
        );
      } else {
        tree.push(map[n._id]);
      }
    });

    return res.json({
      message: "Vendor pricing hierarchy",
      vendorId,
      rootCategoryId,
      tree,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

/* =========================================================
   STEP 9.4: TABLE VIEW
========================================================= */
router.get("/table-view", async (req, res) => {
  try {
    const { vendorId, rootCategoryId } = req.query;

    if (!vendorId || !rootCategoryId) {
      return res.status(400).json({
        message: "vendorId and rootCategoryId are required",
      });
    }

    const nodes = await VendorPriceNode.find({
      vendorId,
      rootCategoryId,
    }).lean();

    if (!nodes.length) {
      return res.json({ message: "No data found", rows: [] });
    }

    const nodeMap = {};
    nodes.forEach((n) => {
      nodeMap[n._id.toString()] = n;
    });

    function buildPath(node) {
      const path = [];
      let current = node;

      while (current) {
        path.unshift(current.name);

        if (!current.parentVendorPriceNodeId) break;

        current =
          nodeMap[
            current.parentVendorPriceNodeId.toString()
          ];
      }

      return path;
    }

    const rows = nodes
      .filter((n) => n.isLeaf)
      .map((leaf) => {
        const path = buildPath(leaf);

        return {
          category: path[0] || "",
          level2: path[1] || "",
          level3: path[2] || "",
          level4: path[3] || "",
          price: leaf.price,
          terms: leaf.terms,
          pricingStatus: leaf.pricingStatus,
          vendorPriceNodeId: leaf._id,
        };
      });

    return res.json({
      message: "Vendor pricing table view",
      vendorId,
      rootCategoryId,
      totalRows: rows.length,
      rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

/* =========================================================
   STEP 10: UPDATE SINGLE LEAF
========================================================= */
router.put("/update", async (req, res) => {
  try {
    const {
      vendorPriceNodeId,
      price,
      terms,
      offerText,        
      pricingStatus,
      visibleToUser,
      visibleToVendor,
    } = req.body;

    if (!vendorPriceNodeId) {
      return res
        .status(400)
        .json({ message: "vendorPriceNodeId is required" });
    }

    const record =
      await VendorPriceNode.findById(vendorPriceNodeId);

    if (!record) {
      return res
        .status(404)
        .json({ message: "VendorPriceNode not found" });
    }

    if (!record.isLeaf) {
      return res
        .status(400)
        .json({ message: "Only leaf nodes can be updated" });
    }

    if (price !== undefined) record.price = price;
    if (terms !== undefined) record.terms = terms;
    if (offerText !== undefined) record.offerText = offerText;
    if (pricingStatus !== undefined)
      record.pricingStatus = pricingStatus;
    if (visibleToUser !== undefined)
      record.visibleToUser = visibleToUser;
    if (visibleToVendor !== undefined)
      record.visibleToVendor = visibleToVendor;

    await record.save();

    return res.json({
      message: "Vendor price node updated successfully",
      vendorPriceNodeId: record._id,
    });
  } catch (err) {
    console.error("UPDATE vendor price node error:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
});

module.exports = router;