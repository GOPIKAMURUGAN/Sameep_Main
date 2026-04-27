const mongoose = require("mongoose");
const DummyVendor = require("../models/DummyVendor");
const Vendor = require("../models/Vendor");
const { getTokenFromRequest, validateCustomerSession } = require("./authMiddleware");
const { validateAdminTokenFromRequest } = require("./adminAuthMiddleware");

function normalizeId(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

async function customerOwnsVendor(customerId, vendorId) {
  const normalizedCustomerId = normalizeId(customerId);
  const normalizedVendorId = normalizeId(vendorId);
  if (
    !mongoose.Types.ObjectId.isValid(normalizedCustomerId) ||
    !mongoose.Types.ObjectId.isValid(normalizedVendorId)
  ) {
    return false;
  }

  const dummyVendor = await DummyVendor.exists({
    _id: normalizedVendorId,
    customerId: normalizedCustomerId,
  });
  if (dummyVendor) return true;

  const vendor = await Vendor.exists({
    _id: normalizedVendorId,
    customerId: normalizedCustomerId,
  });
  return Boolean(vendor);
}

async function validateVendorWriteRequest(req, vendorId) {
  const normalizedVendorId = normalizeId(vendorId);
  if (!normalizedVendorId) {
    return { ok: false, status: 400, message: "Vendor ID is required" };
  }

  const adminResult = validateAdminTokenFromRequest(req);
  if (adminResult.ok) {
    return {
      ok: true,
      authType: "admin",
      vendorId: normalizedVendorId,
      admin: adminResult.admin,
    };
  }

  const token = getTokenFromRequest(req);
  const sessionResult = await validateCustomerSession(token);
  if (!sessionResult.ok) {
    return {
      ok: false,
      status: 401,
      message: "Vendor session invalid or expired",
      code: sessionResult.code || "invalid_session",
    };
  }

  if (normalizeId(sessionResult.vendorId) !== normalizedVendorId) {
    return {
      ok: false,
      status: 403,
      message: "Session does not match this vendor",
      code: "vendor_mismatch",
    };
  }

  const ownsVendor = await customerOwnsVendor(sessionResult.customerId, normalizedVendorId);
  if (!ownsVendor) {
    return {
      ok: false,
      status: 403,
      message: "Vendor owner session required",
      code: "vendor_owner_required",
    };
  }

  return {
    ok: true,
    authType: "vendor",
    vendorId: normalizedVendorId,
    customerId: sessionResult.customerId,
    sessionId: sessionResult.sessionId,
  };
}

function requireVendorWriteAccess(resolveVendorId) {
  return async (req, res, next) => {
    try {
      const vendorId =
        typeof resolveVendorId === "function" ? await resolveVendorId(req) : resolveVendorId;
      const result = await validateVendorWriteRequest(req, vendorId);
      if (!result.ok) {
        return res.status(result.status || 403).json({
          message: result.message || "Vendor write access denied",
          code: result.code || "forbidden",
        });
      }

      req.vendorWriteAuth = result;
      return next();
    } catch (error) {
      console.error("Vendor write auth error:", error.message || error);
      return res.status(500).json({ message: "Failed to validate vendor write access" });
    }
  };
}

function requireVendorParamWriteAccess(paramName = "vendorId") {
  return requireVendorWriteAccess((req) => req.params[paramName]);
}

function requireVendorBodyWriteAccess(fieldName = "vendorId") {
  return requireVendorWriteAccess((req) => req.body?.[fieldName]);
}

function requireOwnedDocumentVendorAccess(Model, idParam = "id") {
  return requireVendorWriteAccess(async (req) => {
    const id = req.params[idParam];
    if (!mongoose.Types.ObjectId.isValid(id)) return "";
    const doc = await Model.findById(id).select("vendorId").lean();
    req.vendorOwnedDocument = doc || null;
    return doc?.vendorId || "";
  });
}

module.exports = {
  validateVendorWriteRequest,
  requireVendorWriteAccess,
  requireVendorParamWriteAccess,
  requireVendorBodyWriteAccess,
  requireOwnedDocumentVendorAccess,
};
