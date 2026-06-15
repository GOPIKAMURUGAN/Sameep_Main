const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");

const DummyVendor = require("../models/DummyVendor");
const VendorMenuNode = require("../models/VendorMenuNode");
const { requireVendorParamWriteAccess } = require("../utils/vendorWriteAuth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

function normalizeText(value = "") {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNumericOnly(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return /^\d+(?:\.\d+)?$/.test(normalized);
}

function sanitizeNumber(value = "") {
  const normalized = normalizeText(value).replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePricingSource(pricingSource, menuSourceType) {
  const nextPricingSource =
    pricingSource === "self_managed" ? "self_managed" : "standard";

  let nextMenuSourceType = menuSourceType;
  if (nextPricingSource === "standard") {
    nextMenuSourceType = "admin_tree";
  }

  if (
    !["admin_tree", "excel_upload", "pdf_upload", "manual_upload"].includes(
      nextMenuSourceType
    )
  ) {
    nextMenuSourceType =
      nextPricingSource === "self_managed" ? "manual_upload" : "admin_tree";
  }

  return {
    pricingSource: nextPricingSource,
    menuSourceType: nextMenuSourceType,
  };
}

function flattenTree(nodes = [], result = []) {
  nodes.forEach((node) => {
    const { children = [], ...rest } = node;
    result.push(rest);
    flattenTree(children, result);
  });
  return result;
}

function buildTree(nodes = []) {
  const map = {};
  const roots = [];

  nodes.forEach((node) => {
    map[String(node._id)] = {
      id: String(node._id),
      name: node.name,
      imageUrl: node.imageUrl || "",
      iconUrl: node.iconUrl || "",
      price: node.price ?? null,
      pricingStatus: node.pricingStatus || "Inactive",
      visibleToUser: node.visibleToUser ?? true,
      visibleToVendor: node.visibleToVendor ?? true,
      terms: node.terms || "",
      packagesIncludes: node.packagesIncludes || "",
      offerText: node.offerText || "",
      customType: normalizeCustomType(node.customType),
      inventoryLabelName: node.inventoryLabelName || "",
      parentSelectorLabel: node.parentSelectorLabel || "",
      sequence: node.sequence ?? 0,
      enableFreeText: node.enableFreeText ?? false,
      freeText: node.freeText || "",
      level: node.level,
      isLeaf: node.isLeaf,
      children: [],
    };
  });

  nodes.forEach((node) => {
    const current = map[String(node._id)];
    if (!node.parentNodeId) {
      roots.push(current);
      return;
    }

    const parent = map[String(node.parentNodeId)];
    if (parent) {
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  });

  function sortNodes(list) {
    list.sort((a, b) => {
      const bySequence = (a.sequence ?? 0) - (b.sequence ?? 0);
      if (bySequence !== 0) return bySequence;
      return a.name.localeCompare(b.name);
    });
    list.forEach((child) => sortNodes(child.children || []));
  }

  sortNodes(roots);

  return {
    children: roots,
    flat: flattenTree(roots),
  };
}

function rowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const allRows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });

    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length === 0) return;
      if (rowIndex === 0) return;
      allRows.push(row.map((cell) => normalizeText(cell)));
    });
  });

  return allRows;
}

function parseExcelRowsToPaths(rows = []) {
  const items = [];

  rows.forEach((row, rowIndex) => {
    const values = row.filter((cell) => normalizeText(cell));
    if (!values.length) return;

    const path = [];
    let price = null;

    for (const cell of values) {
      if (isNumericOnly(cell)) {
        price = sanitizeNumber(cell);
        break;
      }
      path.push(normalizeText(cell));
    }

    if (!path.length) return;

    const leafName = path[path.length - 1];
    const parentPath = path.slice(0, -1);

    items.push({
      rowIndex,
      fullPath: path,
      parentPath,
      leafName,
      price,
      isLeaf: price !== null,
    });
  });

  return items;
}

async function saveParsedMenuItems({
  vendorId,
  items,
  sourceType,
  archiveExisting = false,
}) {
  const uploadBatchId = new mongoose.Types.ObjectId().toString();

  if (archiveExisting) {
    await VendorMenuNode.updateMany(
      { vendorId, datasetStatus: "active" },
      { $set: { datasetStatus: "archived" } }
    );
  }

  const docs = [];
  const pathToTempId = new Map();
  let sequenceCounter = 0;

  items.forEach((item) => {
    item.fullPath.forEach((segment, index) => {
      const pathNames = item.fullPath.slice(0, index + 1);
      const pathKey = pathNames.join(" > ");
      if (pathToTempId.has(pathKey)) return;

      const parentPathKey =
        index > 0 ? item.fullPath.slice(0, index).join(" > ") : null;
      const parentTempId = parentPathKey ? pathToTempId.get(parentPathKey) : null;
      const isLeaf = index === item.fullPath.length - 1 && item.isLeaf;

      const tempId = new mongoose.Types.ObjectId();
      pathToTempId.set(pathKey, tempId);
      sequenceCounter += 1;

      docs.push({
        _id: tempId,
        vendorId,
        parentNodeId: parentTempId,
        name: segment,
        level: index + 1,
        isLeaf,
        price: isLeaf ? item.price : null,
        pricingStatus: isLeaf ? "Active" : "Inactive",
        visibleToUser: true,
        visibleToVendor: true,
        terms: "",
        packagesIncludes: "",
        offerText: "",
        inventoryLabelName: "",
        parentSelectorLabel: "",
        sequence: sequenceCounter,
        enableFreeText: false,
        freeText: "",
        imageUrl: "",
        iconUrl: "",
        sourceType,
        uploadBatchId,
        datasetStatus: "active",
        pathNames,
      });
    });
  });

  if (docs.length) {
    await VendorMenuNode.insertMany(docs);
  }

  return uploadBatchId;
}

async function ensureVendor(vendorId) {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    const error = new Error("Invalid vendorId");
    error.statusCode = 400;
    throw error;
  }

  const vendor = await DummyVendor.findById(vendorId);
  if (!vendor) {
    const error = new Error("Vendor not found");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
}

function normalizeOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCustomType(value) {
  const normalized = normalizeOptionalString(value).toLowerCase();
  if (!normalized) return "service_item";
  if (["service_item", "package", "offer"].includes(normalized)) return normalized;
  return "service_item";
}

function applyCustomTypeFields(payload = {}, customType, isLeaf) {
  const next = { ...payload };
  const effectiveCustomType = isLeaf ? normalizeCustomType(customType) : "";

  next.customType = effectiveCustomType;

  if (!isLeaf) {
    next.price = null;
    next.terms = "";
    next.packagesIncludes = "";
    next.offerText = "";
    return next;
  }

  if (effectiveCustomType === "offer") {
    next.price = null;
    next.terms = "";
    next.packagesIncludes = "";
    return next;
  }

  if (effectiveCustomType === "service_item") {
    next.packagesIncludes = "";
    next.offerText = "";
    return next;
  }

  next.offerText = "";
  return next;
}

function serializeNode(node) {
  return {
    id: String(node._id),
    parentNodeId: node.parentNodeId ? String(node.parentNodeId) : null,
    name: node.name,
    level: node.level,
    isLeaf: node.isLeaf,
    price: node.price,
    pricingStatus: node.pricingStatus,
    visibleToUser: node.visibleToUser,
    visibleToVendor: node.visibleToVendor,
    terms: node.terms,
    packagesIncludes: node.packagesIncludes,
    offerText: node.offerText,
    customType: normalizeCustomType(node.customType),
    inventoryLabelName: node.inventoryLabelName,
    parentSelectorLabel: node.parentSelectorLabel,
    sequence: node.sequence,
    enableFreeText: node.enableFreeText,
    freeText: node.freeText,
    imageUrl: node.imageUrl,
    iconUrl: node.iconUrl,
    sourceType: node.sourceType,
    uploadBatchId: node.uploadBatchId,
    datasetStatus: node.datasetStatus,
    pathNames: node.pathNames || [],
  };
}

async function ensureUniqueSiblingName({
  vendorId,
  datasetStatus,
  parentNodeId = null,
  name,
  excludeNodeId = null,
}) {
  const siblings = await VendorMenuNode.find({
    vendorId,
    datasetStatus,
    parentNodeId: parentNodeId || null,
    ...(excludeNodeId ? { _id: { $ne: excludeNodeId } } : {}),
  })
    .select({ name: 1 })
    .lean();

  const normalizedTarget = normalizeText(name).toLowerCase();
  const duplicate = siblings.some(
    (node) => normalizeText(node.name).toLowerCase() === normalizedTarget
  );

  if (duplicate) {
    const error = new Error("A node with the same name already exists at this level");
    error.statusCode = 409;
    throw error;
  }
}

router.get("/_test", (req, res) => {
  res.json({ ok: true, message: "vendor-menu router working" });
});

router.get("/:vendorId/tree", async (req, res) => {
  try {
    await ensureVendor(req.params.vendorId);
    const datasetStatus =
      req.query.datasetStatus === "archived" ? "archived" : "active";

    const nodes = await VendorMenuNode.find({
      vendorId: req.params.vendorId,
      datasetStatus,
    })
      .sort({ level: 1, sequence: 1, createdAt: 1 })
      .lean();

    return res.json(buildTree(nodes));
  } catch (error) {
    console.error("GET /vendor-menu/:vendorId/tree error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to load vendor menu tree",
    });
  }
});

router.get("/:vendorId/flat", async (req, res) => {
  try {
    await ensureVendor(req.params.vendorId);
    const datasetStatus =
      req.query.datasetStatus === "archived" ? "archived" : "active";

    const nodes = await VendorMenuNode.find({
      vendorId: req.params.vendorId,
      datasetStatus,
    })
      .sort({ level: 1, sequence: 1, createdAt: 1 })
      .lean();

    return res.json(
      nodes.map((node) => ({
        id: String(node._id),
        parentNodeId: node.parentNodeId ? String(node.parentNodeId) : null,
        name: node.name,
        level: node.level,
        isLeaf: node.isLeaf,
        price: node.price,
        pricingStatus: node.pricingStatus,
        visibleToUser: node.visibleToUser,
        visibleToVendor: node.visibleToVendor,
        terms: node.terms,
        packagesIncludes: node.packagesIncludes,
        offerText: node.offerText,
        customType: normalizeCustomType(node.customType),
        inventoryLabelName: node.inventoryLabelName,
        parentSelectorLabel: node.parentSelectorLabel,
        sequence: node.sequence,
        enableFreeText: node.enableFreeText,
        freeText: node.freeText,
        imageUrl: node.imageUrl,
        iconUrl: node.iconUrl,
        sourceType: node.sourceType,
        uploadBatchId: node.uploadBatchId,
        datasetStatus: node.datasetStatus,
        pathNames: node.pathNames || [],
      }))
    );
  } catch (error) {
    console.error("GET /vendor-menu/:vendorId/flat error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to load vendor menu flat data",
    });
  }
});

router.post("/:vendorId/import-excel", requireVendorParamWriteAccess(), upload.single("file"), async (req, res) => {
  try {
    const vendor = await ensureVendor(req.params.vendorId);

    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Please upload an Excel file." });
    }

    const rows = rowsFromWorkbook(req.file.buffer);
    const items = parseExcelRowsToPaths(rows).filter((item) => item.isLeaf);

    if (!items.length) {
      return res.status(400).json({
        message:
          "No priced menu rows were detected. Ensure one of the level columns contains a numeric price.",
      });
    }

    const uploadBatchId = await saveParsedMenuItems({
      vendorId: vendor._id,
      items,
      sourceType: "excel_upload",
      archiveExisting: req.body?.archiveExisting !== "false",
    });

    vendor.pricingSource = "self_managed";
    vendor.menuSourceType = "excel_upload";
    vendor.pricingSourceUpdatedAt = new Date();
    await vendor.save();

    const savedNodes = await VendorMenuNode.find({
      vendorId: vendor._id,
      uploadBatchId,
    })
      .sort({ level: 1, sequence: 1, createdAt: 1 })
      .lean();

    return res.status(201).json({
      success: true,
      uploadBatchId,
      itemCount: items.length,
      ...buildTree(savedNodes),
    });
  } catch (error) {
    console.error("POST /vendor-menu/:vendorId/import-excel error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to import vendor menu from Excel",
    });
  }
});

router.post("/:vendorId/save-tree", requireVendorParamWriteAccess(), async (req, res) => {
  try {
    const vendor = await ensureVendor(req.params.vendorId);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const sourceType =
      req.body?.sourceType === "manual_upload" ? "manual_upload" : "excel_upload";

    const normalizedItems = items
      .map((item) => {
        const fullPath = Array.isArray(item?.fullPath)
          ? item.fullPath.map((segment) => normalizeText(segment)).filter(Boolean)
          : [];
        return {
          fullPath,
          isLeaf: true,
          price: sanitizeNumber(item?.price),
        };
      })
      .filter((item) => item.fullPath.length > 0);

    if (!normalizedItems.length) {
      return res.status(400).json({
        message: "At least one menu path is required to save self-managed menu.",
      });
    }

    const uploadBatchId = await saveParsedMenuItems({
      vendorId: vendor._id,
      items: normalizedItems,
      sourceType,
      archiveExisting: req.body?.archiveExisting !== false,
    });

    vendor.pricingSource = "self_managed";
    vendor.menuSourceType =
      sourceType === "manual_upload" ? "manual_upload" : "excel_upload";
    vendor.pricingSourceUpdatedAt = new Date();
    await vendor.save();

    const savedNodes = await VendorMenuNode.find({
      vendorId: vendor._id,
      uploadBatchId,
    })
      .sort({ level: 1, sequence: 1, createdAt: 1 })
      .lean();

    return res.status(201).json({
      success: true,
      uploadBatchId,
      ...buildTree(savedNodes),
    });
  } catch (error) {
    console.error("POST /vendor-menu/:vendorId/save-tree error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to save vendor menu tree",
    });
  }
});

router.patch("/:vendorId/source", requireVendorParamWriteAccess(), async (req, res) => {
  try {
    const vendor = await ensureVendor(req.params.vendorId);
    const next = normalizePricingSource(
      req.body?.pricingSource,
      req.body?.menuSourceType
    );

    vendor.pricingSource = next.pricingSource;
    vendor.menuSourceType = next.menuSourceType;
    vendor.pricingSourceUpdatedAt = new Date();
    await vendor.save();

    return res.json({
      success: true,
      pricingSource: vendor.pricingSource,
      menuSourceType: vendor.menuSourceType,
      pricingSourceUpdatedAt: vendor.pricingSourceUpdatedAt,
    });
  } catch (error) {
    console.error("PATCH /vendor-menu/:vendorId/source error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update vendor pricing source",
    });
  }
});

router.post("/:vendorId/nodes", requireVendorParamWriteAccess(), async (req, res) => {
  try {
    const vendor = await ensureVendor(req.params.vendorId);

    const datasetStatus =
      req.body?.datasetStatus === "archived" ? "archived" : "active";
    const parentNodeId = req.body?.parentNodeId || null;
    const name = normalizeOptionalString(req.body?.name);
    const nodeType =
      req.body?.nodeType === "service" ? "service" : "subcategory";

    if (!name) {
      return res.status(400).json({ message: "Node name is required" });
    }

    let parentNode = null;
    if (parentNodeId) {
      if (!mongoose.Types.ObjectId.isValid(parentNodeId)) {
        return res.status(400).json({ message: "Invalid parentNodeId" });
      }

      parentNode = await VendorMenuNode.findOne({
        _id: parentNodeId,
        vendorId: req.params.vendorId,
        datasetStatus,
      });

      if (!parentNode) {
        return res.status(404).json({ message: "Parent menu node not found" });
      }

      if (parentNode.isLeaf) {
        return res.status(400).json({
          message: "Cannot add children under a leaf service. Choose a subcategory instead.",
        });
      }
    }

    const siblingFilter = {
      vendorId: req.params.vendorId,
      datasetStatus,
      parentNodeId: parentNode ? parentNode._id : null,
    };

    await ensureUniqueSiblingName({
      vendorId: req.params.vendorId,
      datasetStatus,
      parentNodeId: parentNode ? parentNode._id : null,
      name,
    });

    const lastSibling = await VendorMenuNode.findOne(siblingFilter)
      .sort({ sequence: -1, createdAt: -1 })
      .lean();

    const activeBatchNode = await VendorMenuNode.findOne({
      vendorId: req.params.vendorId,
      datasetStatus: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    const uploadBatchId =
      activeBatchNode?.uploadBatchId ||
      new mongoose.Types.ObjectId().toString();
    const sourceType = "manual_upload";

    const level = parentNode ? Number(parentNode.level || 0) + 1 : 1;
    const isLeaf = nodeType === "service";
    const price = isLeaf ? sanitizeNumber(req.body?.price) : null;
    const customType = isLeaf ? normalizeCustomType(req.body?.customType) : "";

    const createPayload = applyCustomTypeFields({
      vendorId: req.params.vendorId,
      parentNodeId: parentNode ? parentNode._id : null,
      name,
      level,
      isLeaf,
      price,
      pricingStatus: isLeaf ? "Active" : "Inactive",
      visibleToUser: true,
      visibleToVendor: true,
      terms: typeof req.body?.terms === "string" ? req.body.terms : "",
      packagesIncludes:
        typeof req.body?.packagesIncludes === "string" ? req.body.packagesIncludes : "",
      offerText: typeof req.body?.offerText === "string" ? req.body.offerText : "",
      customType,
      inventoryLabelName: "",
      parentSelectorLabel: "",
      sequence: Number(lastSibling?.sequence || 0) + 1,
      enableFreeText: false,
      freeText: "",
      imageUrl: normalizeOptionalString(req.body?.imageUrl),
      iconUrl: "",
      sourceType,
      uploadBatchId,
      datasetStatus,
      pathNames: [...(parentNode?.pathNames || []), name],
    }, customType, isLeaf);

    const newNode = await VendorMenuNode.create(createPayload);

    if (
      vendor.pricingSource !== "self_managed" ||
      vendor.menuSourceType !== "manual_upload"
    ) {
      vendor.pricingSource = "self_managed";
      vendor.menuSourceType = "manual_upload";
      vendor.pricingSourceUpdatedAt = new Date();
      await vendor.save();
    }

    return res.status(201).json({
      success: true,
      node: serializeNode(newNode),
    });
  } catch (error) {
    console.error("POST /vendor-menu/:vendorId/nodes error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create vendor menu node",
    });
  }
});

router.patch("/:vendorId/nodes/:nodeId", requireVendorParamWriteAccess(), async (req, res) => {
  try {
    await ensureVendor(req.params.vendorId);

    if (!mongoose.Types.ObjectId.isValid(req.params.nodeId)) {
      return res.status(400).json({ message: "Invalid nodeId" });
    }

    const node = await VendorMenuNode.findOne({
      _id: req.params.nodeId,
      vendorId: req.params.vendorId,
      datasetStatus: req.body?.datasetStatus === "archived" ? "archived" : "active",
    });

    if (!node) {
      return res.status(404).json({ message: "Vendor menu node not found" });
    }

    const updates = {};

    if (typeof req.body?.name === "string") {
      const name = normalizeOptionalString(req.body.name);
      if (name) updates.name = name;
    }

    if (req.body?.price !== undefined) {
      const parsedPrice =
        req.body.price === null || req.body.price === ""
          ? null
          : sanitizeNumber(req.body.price);
      updates.price = parsedPrice;
    }

    if (typeof req.body?.pricingStatus === "string") {
      const status = normalizeOptionalString(req.body.pricingStatus);
      if (["Active", "Inactive", "Archive"].includes(status)) {
        updates.pricingStatus = status;
      }
    }

    if (typeof req.body?.terms === "string") {
      updates.terms = req.body.terms;
    }

    if (typeof req.body?.packagesIncludes === "string") {
      updates.packagesIncludes = req.body.packagesIncludes;
    }

    if (typeof req.body?.offerText === "string") {
      updates.offerText = req.body.offerText;
    }

    if (typeof req.body?.customType === "string") {
      updates.customType = normalizeCustomType(req.body.customType);
    }

    if (typeof req.body?.imageUrl === "string") {
      updates.imageUrl = req.body.imageUrl.trim();
    }

    if (req.body?.visibleToUser !== undefined) {
      updates.visibleToUser = Boolean(req.body.visibleToUser);
    }

    if (req.body?.visibleToVendor !== undefined) {
      updates.visibleToVendor = Boolean(req.body.visibleToVendor);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    if (updates.name && normalizeText(updates.name) !== normalizeText(node.name)) {
      await ensureUniqueSiblingName({
        vendorId: req.params.vendorId,
        datasetStatus: node.datasetStatus,
        parentNodeId: node.parentNodeId || null,
        name: updates.name,
        excludeNodeId: node._id,
      });
    }

    const previousPathNames = Array.isArray(node.pathNames) ? [...node.pathNames] : [];

    const nextIsLeaf = updates.isLeaf !== undefined ? Boolean(updates.isLeaf) : Boolean(node.isLeaf);
    const effectiveCustomType =
      updates.customType !== undefined ? updates.customType : node.customType;
    const normalizedUpdates = applyCustomTypeFields(updates, effectiveCustomType, nextIsLeaf);

    Object.assign(node, normalizedUpdates);
    if (updates.name) {
      const parentPathNames = previousPathNames.slice(0, -1);
      node.pathNames = [...parentPathNames, node.name];
    }
    await node.save();

    if (
      updates.name &&
      previousPathNames.length &&
      Array.isArray(node.pathNames) &&
      node.pathNames.length
    ) {
      const descendants = await VendorMenuNode.find({
        vendorId: req.params.vendorId,
        datasetStatus: node.datasetStatus,
      }).lean();

      const affectedDescendants = descendants.filter((descendant) => {
        if (String(descendant._id) === String(node._id)) return false;
        if (!Array.isArray(descendant.pathNames)) return false;
        if (descendant.pathNames.length <= previousPathNames.length) return false;
        return previousPathNames.every(
          (segment, index) => descendant.pathNames[index] === segment
        );
      });

      if (affectedDescendants.length) {
        await VendorMenuNode.bulkWrite(
          affectedDescendants.map((descendant) => ({
            updateOne: {
              filter: { _id: descendant._id },
              update: {
                $set: {
                  pathNames: [
                    ...node.pathNames,
                    ...descendant.pathNames.slice(previousPathNames.length),
                  ],
                },
              },
            },
          }))
        );
      }
    }

    return res.json({
      success: true,
      node: serializeNode(node),
    });
  } catch (error) {
    console.error("PATCH /vendor-menu/:vendorId/nodes/:nodeId error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update vendor menu node",
    });
  }
});

router.delete("/:vendorId/nodes/:nodeId", requireVendorParamWriteAccess(), async (req, res) => {
  try {
    await ensureVendor(req.params.vendorId);

    if (!mongoose.Types.ObjectId.isValid(req.params.nodeId)) {
      return res.status(400).json({ message: "Invalid nodeId" });
    }

    const datasetStatus =
      req.query?.datasetStatus === "archived" ? "archived" : "active";

    const node = await VendorMenuNode.findOne({
      _id: req.params.nodeId,
      vendorId: req.params.vendorId,
      datasetStatus,
    }).lean();

    if (!node) {
      return res.status(404).json({ message: "Vendor menu node not found" });
    }

    const nodePath = Array.isArray(node.pathNames) ? node.pathNames : [];
    const allNodes = await VendorMenuNode.find({
      vendorId: req.params.vendorId,
      datasetStatus,
    }).lean();

    const idsToDelete = allNodes
      .filter((candidate) => {
        if (String(candidate._id) === String(node._id)) return true;
        if (!nodePath.length || !Array.isArray(candidate.pathNames)) return false;
        if (candidate.pathNames.length <= nodePath.length) return false;
        return nodePath.every(
          (segment, index) => candidate.pathNames[index] === segment
        );
      })
      .map((candidate) => candidate._id);

    await VendorMenuNode.deleteMany({
      _id: { $in: idsToDelete },
      vendorId: req.params.vendorId,
      datasetStatus,
    });

    return res.json({
      success: true,
      deletedCount: idsToDelete.length,
      deletedNodeId: req.params.nodeId,
    });
  } catch (error) {
    console.error("DELETE /vendor-menu/:vendorId/nodes/:nodeId error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to delete vendor menu node",
    });
  }
});

module.exports = router;
