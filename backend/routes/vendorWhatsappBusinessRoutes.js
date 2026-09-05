const express = require("express");
const { requireVendorAccessFromExistingAuth } = require("../utils/vendorWriteAuth");
const { verifyWhatsappConnectToken } = require("../utils/whatsappConnectToken");
const {
  disconnectWhatsappBusiness,
  completeMetaWhatsappConnection,
  createMetaConnectSession,
  getMetaDiagnostics,
  getMetaEmbeddedSignupConfig,
  getWhatsappBusinessConfig,
  prepareWhatsappBusinessConnect,
  updateWhatsappBusinessConfig,
} = require("../controllers/vendorWhatsappBusinessController");

const router = express.Router();

const resolveRequestedVendorId = (req) => req.body?.vendorId || req.query?.vendorId;

function requireDevelopmentDiagnostics(req, res, next) {
  const env = String(process.env.NODE_ENV || "development").toLowerCase();
  if (env === "production") {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  return next();
}

function requireVendorOrWhatsappConnectAccess(req, res, next) {
  const token =
    req.body?.connectToken ||
    req.query?.connectToken ||
    req.headers["x-whatsapp-connect-token"];
  const result = verifyWhatsappConnectToken(token);

  if (result.ok) {
    req.whatsappConnectAuth = result;
    req.vendorWriteAuth = {
      ok: true,
      authType: "whatsapp_connect",
      vendorId: result.vendorId,
      customerId: result.customerId,
    };
    return next();
  }

  return requireVendorAccessFromExistingAuth(resolveRequestedVendorId)(req, res, next);
}

router.get(
  "/",
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  getWhatsappBusinessConfig
);

router.get(
  "/meta/config",
  requireVendorOrWhatsappConnectAccess,
  getMetaEmbeddedSignupConfig
);

router.get(
  "/meta/diagnostics",
  requireDevelopmentDiagnostics,
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  getMetaDiagnostics
);

router.post(
  "/meta/connect-session",
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  createMetaConnectSession
);

router.patch(
  "/",
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  updateWhatsappBusinessConfig
);

router.post(
  "/connect",
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  prepareWhatsappBusinessConnect
);

router.post(
  "/meta/complete",
  requireVendorOrWhatsappConnectAccess,
  completeMetaWhatsappConnection
);

router.post(
  "/disconnect",
  requireVendorAccessFromExistingAuth(resolveRequestedVendorId),
  disconnectWhatsappBusiness
);

module.exports = router;
