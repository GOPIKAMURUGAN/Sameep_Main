const VendorFlow = require("../models/VendorFlow");
const Vendor = require("../models/Vendor");
const Category = require("../models/Category");
const DummyVendor = require("../models/DummyVendor");

// GET all services for a specific vendor (flattened, frontend-ready)
exports.getVendorFlows = async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID required" });
    }

    // One document per vendor: return services for UI
    const doc = await VendorFlow.findOne({ vendorId }).lean();
    if (!doc) return res.json([]);

    // Add vendorId and a stable id for each service item for UI usage
    const rows = (Array.isArray(doc.services) ? doc.services : []).map((row) => {
      const attrsRaw = row && row.attributes;
      let attributes = {};
      if (attrsRaw) {
        attributes = typeof attrsRaw === 'object' && !(attrsRaw instanceof Array) ? attrsRaw : {};
      }
      return {
        ...row,
        attributes,
        _serviceId: row._id,
        vendorId: doc.vendorId,
      };
    });
    res.json(rows);
  } catch (err) {
    console.error("Error getting vendor flows:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET a single vendor flow by ID
exports.getVendorFlowById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const flow = await VendorFlow.findById(id)
      .populate('vendorId', 'businessName contactName')
      .populate('category.level1.id', 'name')
      .populate('category.level2.id', 'name')
      .populate('category.level3.id', 'name');

    if (!flow) {
      return res.status(404).json({ message: "Vendor flow not found" });
    }

    res.json(flow);
  } catch (err) {
    console.error("Error getting vendor flow:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE a new vendor flow
exports.createVendorFlow = async (req, res) => {
  try {
    const {
      vendorId,
      category,
      attributes,
      price,
      terms,
      pricingStatus,
      images,
      sequence
    } = req.body;

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(400).json({ message: "Vendor not found" });
    }

    // Validate categories exist
    if (category.level1.id) {
      const level1Category = await Category.findById(category.level1.id);
      if (!level1Category) {
        return res.status(400).json({ message: "Level 1 category not found" });
      }
    }

    if (category.level2.id) {
      const level2Category = await Category.findById(category.level2.id);
      if (!level2Category) {
        return res.status(400).json({ message: "Level 2 category not found" });
      }
    }

    if (category.level3.id) {
      const level3Category = await Category.findById(category.level3.id);
      if (!level3Category) {
        return res.status(400).json({ message: "Level 3 category not found" });
      }
    }

    // Check if flow already exists for this vendor and category combination
    const existingFlow = await VendorFlow.findOne({
      vendorId,
      'category.level1.id': category.level1.id,
      'category.level2.id': category.level2.id,
      'category.level3.id': category.level3.id
    });

    if (existingFlow) {
      return res.status(400).json({ message: "Flow already exists for this category combination" });
    }

    const newFlow = new VendorFlow({
      vendorId,
      category,
      attributes: attributes || {},
      price: price || 0,
      terms: terms || [],
      pricingStatus: pricingStatus || 'Inactive',
      images: images || [],
      sequence: sequence || 0
    });

    // Add creation log
    newFlow.logs.push({
      action: 'Created',
      details: 'Vendor flow created',
      userId: req.user?.id
    });

    await newFlow.save();

    const populatedFlow = await VendorFlow.findById(newFlow._id)
      .populate('vendorId', 'businessName contactName')
      .populate('category.level1.id', 'name')
      .populate('category.level2.id', 'name')
      .populate('category.level3.id', 'name');

    res.status(201).json(populatedFlow);
  } catch (err) {
    console.error("Error creating vendor flow:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE a vendor flow
exports.updateVendorFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const flow = await VendorFlow.findById(id);
    if (!flow) {
      return res.status(404).json({ message: "Vendor flow not found" });
    }

    // Add update log
    if (updates.logs === undefined) {
      updates.logs = flow.logs;
    }
    updates.logs.push({
      action: 'Updated',
      details: 'Vendor flow updated',
      userId: req.user?.id
    });

    const updatedFlow = await VendorFlow.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('vendorId', 'businessName contactName')
      .populate('category.level1.id', 'name')
      .populate('category.level2.id', 'name')
      .populate('category.level3.id', 'name');

    res.json(updatedFlow);
  } catch (err) {
    console.error("Error updating vendor flow:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE a vendor flow
exports.deleteVendorFlow = async (req, res) => {
  try {
    const { id } = req.params;

    const flow = await VendorFlow.findById(id);
    if (!flow) {
      return res.status(404).json({ message: "Vendor flow not found" });
    }

    await VendorFlow.findByIdAndDelete(id);

    res.json({ message: "Vendor flow deleted successfully" });
  } catch (err) {
    console.error("Error deleting vendor flow:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE pricing status for a vendor flow
exports.updatePricingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { pricingStatus } = req.body;

    if (!['Active', 'Inactive'].includes(pricingStatus)) {
      return res.status(400).json({ message: "Invalid pricing status" });
    }

    const flow = await VendorFlow.findById(id);
    if (!flow) {
      return res.status(404).json({ message: "Vendor flow not found" });
    }

    // Add status change log
    flow.logs.push({
      action: 'Status Changed',
      details: `Pricing status changed from ${flow.pricingStatus} to ${pricingStatus}`,
      userId: req.user?.id
    });

    flow.pricingStatus = pricingStatus;
    await flow.save();

    const updatedFlow = await VendorFlow.findById(id)
      .populate('vendorId', 'businessName contactName')
      .populate('category.level1.id', 'name')
      .populate('category.level2.id', 'name')
      .populate('category.level3.id', 'name');

    res.json(updatedFlow);
  } catch (err) {
    console.error("Error updating pricing status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.checkSubdomainAvailability = async (req, res) => {
  try {
    const { businessName, locations } = req.query;

    const locationList = (locations || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const candidates = generateSubdomainSuggestions(businessName, locationList);

    const existing = await DummyVendor.find({
      subdomain: { $in: candidates },
    }).select("subdomain");

    const taken = new Set(existing.map((v) => v.subdomain));
    const available = candidates.filter((s) => !taken.has(s));
    const finalSuggestions = available.slice(0, 5);

    res.json({
      available: finalSuggestions.length > 0,
      suggestions: finalSuggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function slugify(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compact(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function generateSubdomainSuggestions(businessName, locations = []) {
  const hyphenName = slugify(businessName);
  const compactName = compact(businessName);

  if (!hyphenName && !compactName) return [];

  const unique = new Set();

  if (compactName) unique.add(compactName);
  if (hyphenName) unique.add(hyphenName);

  locations.forEach((loc) => {
    const hyphenLoc = slugify(loc);
    const compactLoc = compact(loc);

    if (compactName && compactLoc) unique.add(`${compactName}${compactLoc}`);
    if (hyphenName && hyphenLoc) unique.add(`${hyphenName}-${hyphenLoc}`);
  });

  return Array.from(unique);
}

exports.setSubdomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { subdomain } = req.body;

    const vendor = await DummyVendor.findById(id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    if (vendor.subdomain)
      return res.status(400).json({ error: 'Subdomain already set' });

    const exists = await DummyVendor.findOne({ subdomain });
    if (exists)
      return res.status(400).json({ error: 'Subdomain taken' });

    vendor.subdomain = subdomain.toLowerCase();
    await vendor.save();

    res.json({ subdomain: vendor.subdomain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVendorBySubdomain = async (req, res) => {
  try {
    const sub = req.params.subdomain.toLowerCase();

    // ✅ Convert to plain object
    const vendor = await DummyVendor.findOne({ subdomain: sub }).lean();

    if (!vendor) {
      return res.status(404).json({ error: "Not found" });
    }

    // ✅ Clean JSON response
    res.json({
      vendorId: vendor._id,
      ...vendor,
    });

  } catch (err) {
    console.error("Subdomain fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// SAVE SERVICE AREAS
// ============================================
const mongoose = require("mongoose");
//const DummyVendor = require("../models/DummyVendor");

/**
 * ============================================
 * SAVE SERVICE AREAS
 * POST /api/vendor/service-areas
 * ============================================
 */
exports.saveServiceAreas = async (req, res) => {
  try {
    const {
      vendorId,
      primaryLocality,
      city,
      targetAreas,
      autoSuggested,
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendorId",
      });
    }

    const updatePayload = {
      serviceAreas: {
        primaryLocality: primaryLocality || "",
        city: city || "",
        targetAreas: Array.isArray(targetAreas) ? targetAreas : [],
        autoSuggested: autoSuggested ?? true,
      },

      // Backward compatibility (optional)
      ...(Array.isArray(targetAreas) && targetAreas.length
        ? { "location.nearbyLocations": targetAreas }
        : {}),
    };

    const updated = await DummyVendor.findByIdAndUpdate(
      vendorId,
      { $set: updatePayload },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let categoryName = "";
    if (updated.categoryId) {
      try {
        const DummyCategory = require("../models/dummyCategory");
        const cat = await DummyCategory.findById(updated.categoryId).lean();
        categoryName = String(cat?.name || "").trim();
      } catch (_) {}
    }

    const years = updated.trustSummary?.experienceYears || "";
    const customers = updated.trustSummary?.customers || updated.trustSummary?.customersServedMin || "";
    const rating = updated.googlePlace?.rating || "";
    const areas = (updated.serviceAreas?.targetAreas || []).slice(0, 3).join(", ");
    const localityLabel = primaryLocality || updated.serviceAreas?.primaryLocality || "";
    const cityLabel = city || updated.serviceAreas?.city || "";

    const locationLabel = [localityLabel, cityLabel].filter(Boolean).join(", ");
    const heading = locationLabel
      ? `${categoryName || "Professional Services"} in ${locationLabel}`
      : categoryName || "Professional Services";

    updated.customFields = updated.customFields || {};
    updated.customFields.freeText1 = heading;

    const locationCopy = locationLabel || cityLabel || "your area";
    const areasCopy = areas || localityLabel || "";
    const description = `Trusted by ${customers || "many"} clients${years ? ` with ${years}+ years of experience` : ""}, ${updated.businessName} offers premium services in ${locationCopy}${areasCopy ? ` including ${areasCopy}` : ""}. ${rating ? `Rated ${rating}★ on Google,` : ""} we deliver personalised experiences tailored for every customer.`
      .replace(/\s+/g, " ")
      .trim();

    updated.customFields.freeText2 = description;

    await updated.save();

    return res.json({
      success: true,
      serviceAreas: updated.serviceAreas,
    });
  } catch (err) {
    console.error("saveServiceAreas error:", err);
    return res.status(500).json({ success: false });
  }
};


// ADD log entry to vendor flow
exports.addLogEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ message: "Action is required" });
    }

    const flow = await VendorFlow.findById(id);
    if (!flow) {
      return res.status(404).json({ message: "Vendor flow not found" });
    }

    flow.logs.push({
      action,
      details: details || '',
      userId: req.user?.id
    });

    await flow.save();

    res.json({ message: "Log entry added successfully", log: flow.logs[flow.logs.length - 1] });
  } catch (err) {
    console.error("Error adding log entry:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET vendor flows by pricing status
exports.getVendorFlowsByStatus = async (req, res) => {
  try {
    const { vendorId, status } = req.params;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: "Invalid pricing status" });
    }

    const flows = await VendorFlow.find({ 
      vendorId, 
      pricingStatus: status 
    })
      .populate('vendorId', 'businessName contactName')
      .populate('category.level1.id', 'name')
      .populate('category.level2.id', 'name')
      .populate('category.level3.id', 'name')
      .sort({ sequence: 1, createdAt: -1 });

    res.json(flows);
  } catch (err) {
    console.error("Error getting vendor flows by status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// SYNC old vendor data to new VendorFlow structure
exports.syncVendorFlows = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { categoryId, force } = req.query || {};

    // Get vendor and check if exists
    const Vendor = require('../models/Vendor');
    const DummyVendor = require('../models/DummyVendor');
    let vendor = await Vendor.findById(vendorId);
    let isDummy = false;
    if (!vendor) {
      vendor = await DummyVendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      isDummy = true;
    }
    
    // Debug: Check vendor's inventory selections structure
    if (isDummy && vendor.inventorySelections) {
      console.log(`Vendor ${vendorId} inventory selections structure:`, JSON.stringify(vendor.inventorySelections, null, 2));
    } else if (isDummy) {
      console.log(`Vendor ${vendorId} has no inventory selections or inventorySelections field is missing`);
    }

    // Check if flows already exist
    const existingDoc = await VendorFlow.findOne({ vendorId });
    if (existingDoc) {
      if (String(force).toLowerCase() === '1' || String(force).toLowerCase() === 'true') {
        await VendorFlow.deleteOne({ vendorId });
      } else {
        return res.status(400).json({ 
          message: "Vendor flows already exist. Use force=true to rebuild.",
          flows: (Array.isArray(existingDoc.flows) ? existingDoc.flows : [])
        });
      }
    }

    let vendorCategories = [];
    // If this is a Dummy Vendor, try to derive from existing dummy vendor endpoints for accurate leafs
    if (isDummy && categoryId) {
      try {
        const axios = require('axios');
        const base = `${req.protocol}://${req.get('host')}`;
        const url = `${base}/api/dummy-vendors/${vendorId}/categories/${categoryId}/inventory`;
        const resp = await axios.get(url);
        const data = resp.data || {};
        const cats = data.categories;
        if (cats) {
          vendorCategories = Array.isArray(cats) ? cats : [{ ...cats, children: cats.children || [] }];
        }
      } catch (e) {
        // ignore and fallback to Category model
      }
    }
    if (!vendorCategories || vendorCategories.length === 0) {
      const Category = require('../models/Category');
      const vendorCategoryId = vendor.categoryId;
      const buildCategoryTree = async (rootCat) => {
        const allCats = await Category.find({
          $or: [
            { _id: rootCat._id },
            { parent: rootCat._id }
          ]
        }).sort({ sequence: 1 });
        const tree = allCats.find(cat => cat._id.toString() === rootCat._id.toString());
        if (tree) {
          const children = allCats.filter(cat => 
            cat.parent && cat.parent.toString() === rootCat._id.toString()
          );
          tree.children = children;
        }
        return tree;
      };
      if (vendorCategoryId) {
        const rootCat = await Category.findById(vendorCategoryId);
        if (rootCat) {
          vendorCategories = await buildCategoryTree(rootCat);
        }
      }
    }

    // Collect leaf nodes first (to build services)
    const leaves = [];
    const collectLeaves = (cats, parentLevels = [], parentIds = []) => {
      cats.forEach(cat => {
        if (!cat) return;
        const levels = [...parentLevels, cat.name];
        const ids = [...parentIds, cat._id];
        if (!cat.children || (Array.isArray(cat.children) && cat.children.length === 0)) {
          leaves.push({ levels, ids, cat });
        } else {
          collectLeaves(cat.children, levels, ids);
        }
      });
    };
    if (vendorCategories) {
      if (Array.isArray(vendorCategories)) collectLeaves(vendorCategories);
      else collectLeaves([vendorCategories]);
    }

    // Prepare attributes by querying inventory selections per leaf category (cached)
    const flowsToCreate = [];
    const axios = require('axios');
    const base = `${req.protocol}://${req.get('host')}`;
    const selectionCache = new Map(); // cid -> attributes map
    const getAttributesForLeaf = async (leafCid) => {
      if (!leafCid) return {};
      const key = String(leafCid);
      if (selectionCache.has(key)) return selectionCache.get(key);
      try {
        const urlSel = `${base}/api/dummy-categories/${key}/vendors/${vendorId}/inventory-selections`;
        const selResp = await axios.get(urlSel);
        const raw = selResp.data || {};
        console.log(`Inventory selections for category ${key}, vendor ${vendorId}:`, JSON.stringify(raw, null, 2));
        
        // Normalize to a flat key-value map of strings
        const out = {};
        
        // Check if we have items array
        if (raw.items && Array.isArray(raw.items)) {
          console.log(`Found ${raw.items.length} items in inventory selections`);
          // Convert items array to key-value map
          raw.items.forEach(item => {
            if (item && typeof item === 'object') {
              const key = item.key || item.name || item.field || Object.keys(item)[0];
              const value = item.value || item.text || item.selected || item;
              if (key && value != null) {
                out[String(key)] = String(value);
                console.log(`Added attribute: ${key} = ${value}`);
              }
            }
          });
        } else {
          console.log('No items array found in response, trying other fields...');
          // Try common shapes
          const assignFlat = (prefix, obj) => {
            if (obj == null) return;
            if (typeof obj !== 'object') { out[prefix || 'value'] = String(obj); return; }
            Object.entries(obj).forEach(([k, v]) => {
              const nextKey = prefix ? `${prefix}.${k}` : String(k);
              if (v != null && typeof v === 'object') assignFlat(nextKey, v);
              else if (v != null) out[nextKey] = String(v);
            });
          };
          if (raw.selections) {
            assignFlat('', raw.selections);
          } else if (raw.attributes) {
            assignFlat('', raw.attributes);
          } else {
            assignFlat('', raw);
          }
        }
        
        console.log(`Final attributes for category ${key}:`, out);
        selectionCache.set(key, out);
        return out;
      } catch (e) {
        console.log(`Error fetching inventory selections for category ${key}:`, e.message);
        selectionCache.set(key, {});
        return {};
      }
    };

    for (const item of leaves) {
      const { levels, ids, cat } = item;
      const leafCid = ids[ids.length - 1];
      const attributes = await getAttributesForLeaf(leafCid);
      const flowData = {
        vendorId,
        category: {
          level1: { id: ids[0], name: levels[0] },
          level2: ids[1] ? { id: ids[1], name: levels[1] } : undefined,
          level3: ids[2] ? { id: ids[2], name: levels[2] } : undefined
        },
        attributes,
        price: cat.price || 0,
        terms: cat.terms && cat.terms.length > 0 ? String(cat.terms).split(',').map(t => ({
          id: Math.random().toString(36).substr(2, 9),
          text: String(t).trim(),
          checked: false
        })) : [],
        pricingStatus: 'Inactive',
        images: [],
        logs: [{
          action: 'Synced from old system',
          details: 'Automatically created from existing vendor categories',
          timestamp: new Date()
        }]
      };
      flowsToCreate.push(flowData);
    }

    // Save new services
    if (flowsToCreate.length === 0) {
      return res.json({ 
        message: "No categories found to sync",
        services: [] 
      });
    }

    // Project new services array per the flattened design
    const services = flowsToCreate.map((f) => ({
      categoryPath: [
        f.category?.level1?.name,
        f.category?.level2?.name,
        f.category?.level3?.name,
      ].filter(Boolean),
      categoryIds: [
        f.category?.level1?.id,
        f.category?.level2?.id,
        f.category?.level3?.id,
      ].filter(Boolean),
      price: Number(f.price || 0),
      terms: Array.isArray(f.terms) ? f.terms.map(t => (typeof t === 'string' ? t : t?.text || '')) .filter(Boolean) : [],
      status: (f.pricingStatus === 'Active' || f.pricingStatus === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE',
      attributes: f.attributes || {},
      logs: f.logs || [],
    }));

    // Create a single document per vendor with new services
    const created = await VendorFlow.create({ vendorId, services });

    res.json({ 
      message: `Successfully created ${services.length} vendor services`,
      services: (created.services || []).map((s) => ({
        ...((s.toObject && s.toObject()) || s),
        _serviceId: s._id,
        vendorId: created.vendorId,
      })),
    });

  } catch (err) {
    console.error("Error syncing vendor flows:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// Update price for a specific service item (subdocument) without affecting categories or other vendors
exports.updateServicePrice = async (req, res) => {
  try {
    const { vendorId, serviceId } = req.params;
    const { price } = req.body;
    const num = (price === '' || price == null) ? 0 : Number(price);
    if (Number.isNaN(num) || num < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const update = await VendorFlow.findOneAndUpdate(
      { vendorId, 'services._id': serviceId },
      {
        $set: { 'services.$.price': num },
        $push: { 'services.$.logs': { action: 'Price Updated', details: `Price set to ${num}`, timestamp: new Date(), userId: req.user?.id } }
      },
      { new: true }
    ).lean();

    if (!update) return res.status(404).json({ message: 'Service not found' });

    const rows = (Array.isArray(update.services) ? update.services : []).map((row) => ({
      ...row,
      _serviceId: row._id,
      vendorId: update.vendorId,
      attributes: row && row.attributes && row.attributes instanceof Map ? Object.fromEntries(row.attributes.entries()) : (row.attributes || {})
    }));
    res.json({ message: 'Price updated', services: rows });
  } catch (err) {
    console.error('Error updating service price:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update status for a specific service item (subdocument)
exports.updateServiceStatus = async (req, res) => {
  try {
    const { vendorId, serviceId } = req.params;
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be ACTIVE or INACTIVE' });
    }

    const update = await VendorFlow.findOneAndUpdate(
      { vendorId, 'services._id': serviceId },
      {
        $set: { 'services.$.status': status },
        $push: { 'services.$.logs': { action: 'Status Updated', details: `Status set to ${status}`, timestamp: new Date(), userId: req.user?.id } }
      },
      { new: true }
    ).lean();

    if (!update) return res.status(404).json({ message: 'Service not found' });

    const rows = (Array.isArray(update.services) ? update.services : []).map((row) => ({
      ...row,
      _serviceId: row._id,
      vendorId: update.vendorId,
      attributes: row && row.attributes && row.attributes instanceof Map ? Object.fromEntries(row.attributes.entries()) : (row.attributes || {})
    }));
    res.json({ message: 'Status updated', services: rows });
  } catch (err) {
    console.error('Error updating service status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get logs for a specific service item
exports.getServiceLogs = async (req, res) => {
  try {
    const { vendorId, serviceId } = req.params;
    
    const doc = await VendorFlow.findOne(
      { vendorId, 'services._id': serviceId },
      { 'services.$': 1 }
    ).lean();

    if (!doc || !doc.services || doc.services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const service = doc.services[0];
    const logs = Array.isArray(service.logs) ? service.logs : [];
    
    res.json({ 
      serviceId: service._id,
      categoryPath: service.categoryPath || [],
      logs: logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (err) {
    console.error('Error fetching service logs:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
