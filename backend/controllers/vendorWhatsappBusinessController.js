const mongoose = require("mongoose");
const DummyVendor = require("../models/DummyVendor");
const Vendor = require("../models/Vendor");
const { getDefaultWhatsappBusinessConfig } = require("../models/whatsappBusinessConfigSchema");
const { getPublicMetaWhatsAppConfig } = require("../config/metaWhatsAppConfig");
const { encryptMetaAccessToken } = require("../services/metaTokenStorage");
const { createWhatsappConnectToken } = require("../utils/whatsappConnectToken");
const {
  exchangeEmbeddedSignupCode,
  runMetaConfigurationDiagnostics,
  validateConnection,
} = require("../services/metaWhatsAppService");

function normalizeVendorId(value) {
  const id = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

async function findVendorRecord(vendorId) {
  const normalizedVendorId = normalizeVendorId(vendorId);
  if (!normalizedVendorId) return null;

  const dummyVendor = await DummyVendor.findById(normalizedVendorId).lean();
  if (dummyVendor) {
    return { Model: DummyVendor, vendor: dummyVendor };
  }

  const vendor = await Vendor.findById(normalizedVendorId).lean();
  if (vendor) {
    return { Model: Vendor, vendor };
  }

  return null;
}

function getAuthorizedVendorId(req) {
  return normalizeVendorId(
    req.vendorWriteAuth?.vendorId ||
      req.whatsappConnectAuth?.vendorId ||
      req.body?.vendorId ||
      req.query?.vendorId
  );
}

function normalizeWhatsappBusinessConfig(config) {
  return {
    ...getDefaultWhatsappBusinessConfig(),
    ...(config && typeof config.toObject === "function" ? config.toObject() : config || {}),
  };
}

function sanitizeWhatsappBusinessConfig(config) {
  const normalized = normalizeWhatsappBusinessConfig(config);

  return {
    enabled: Boolean(normalized.enabled),
    provider: normalized.provider === "meta" ? "meta" : "msg91",
    connectionStatus: normalized.connectionStatus || "not_connected",
    displayPhoneNumber: normalized.displayPhoneNumber || "",
    displayName: normalized.displayName || "",
    templateStatus: normalized.templateStatus || "",
    connectedAt: normalized.connectedAt || null,
    lastError: normalized.lastError
      ? "Connection needs attention. Please contact YNOT support."
      : "",
  };
}

function sendVendorNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Vendor not found",
  });
}

function isDevelopmentDiagnosticsAllowed() {
  const env = String(process.env.NODE_ENV || "development").toLowerCase();
  return env !== "production";
}

async function getWhatsappBusinessConfig(req, res) {
  try {
    const record = await findVendorRecord(getAuthorizedVendorId(req));
    if (!record) return sendVendorNotFound(res);

    return res.json({
      success: true,
      data: sanitizeWhatsappBusinessConfig(record.vendor.whatsappBusiness),
    });
  } catch (error) {
    console.error("Failed to fetch WhatsApp Business config:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp Business configuration",
    });
  }
}

async function getMetaEmbeddedSignupConfig(req, res) {
  try {
    return res.json({
      success: true,
      data: {
        ...getPublicMetaWhatsAppConfig(),
        returnUrl: req.whatsappConnectAuth?.returnUrl || "",
      },
    });
  } catch (error) {
    console.error("Failed to load Meta WhatsApp config:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to load WhatsApp setup configuration",
    });
  }
}

async function getMetaDiagnostics(req, res) {
  if (!isDevelopmentDiagnosticsAllowed()) {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  try {
    const diagnostics = await runMetaConfigurationDiagnostics();
    return res.json({
      success: true,
      data: diagnostics,
    });
  } catch (error) {
    console.error("Meta WhatsApp diagnostics failed:", error.code || error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to run Meta WhatsApp diagnostics",
    });
  }
}

async function createMetaConnectSession(req, res) {
  try {
    const vendorId = getAuthorizedVendorId(req);
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const token = createWhatsappConnectToken({
      vendorId,
      customerId: req.vendorWriteAuth?.customerId || "",
      returnUrl: req.body?.returnUrl || "",
    });

    return res.json({
      success: true,
      data: {
        connectToken: token,
        expiresInSeconds: 15 * 60,
      },
    });
  } catch (error) {
    console.error("Failed to create Meta connect session:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to start WhatsApp Business setup",
    });
  }
}

async function updateWhatsappBusinessConfig(req, res) {
  try {
    const record = await findVendorRecord(getAuthorizedVendorId(req));
    if (!record) return sendVendorNotFound(res);

    const current = normalizeWhatsappBusinessConfig(record.vendor.whatsappBusiness);
    const whatsappBusiness = {
      ...current,
      displayName:
        typeof req.body?.displayName === "string"
          ? req.body.displayName.trim()
          : current.displayName,
      displayPhoneNumber:
        typeof req.body?.displayPhoneNumber === "string"
          ? req.body.displayPhoneNumber.trim()
          : current.displayPhoneNumber,
    };

    await record.Model.updateOne(
      { _id: record.vendor._id },
      { $set: { whatsappBusiness } }
    );

    return res.json({
      success: true,
      data: sanitizeWhatsappBusinessConfig(whatsappBusiness),
    });
  } catch (error) {
    console.error("Failed to update WhatsApp Business config:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to update WhatsApp Business configuration",
    });
  }
}

async function prepareWhatsappBusinessConnect(req, res) {
  try {
    const record = await findVendorRecord(getAuthorizedVendorId(req));
    if (!record) return sendVendorNotFound(res);

    const current = normalizeWhatsappBusinessConfig(record.vendor.whatsappBusiness);
    const whatsappBusiness = {
      ...current,
      enabled: false,
      provider: "msg91",
      connectionStatus: "connecting",
      templateStatus: current.templateStatus || "not_started",
      lastError: "",
    };

    await record.Model.updateOne(
      { _id: record.vendor._id },
      { $set: { whatsappBusiness } }
    );

    return res.json({
      success: true,
      data: sanitizeWhatsappBusinessConfig(whatsappBusiness),
      message: "WhatsApp Business connection setup has been started",
    });
  } catch (error) {
    console.error("Failed to prepare WhatsApp Business connection:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to start WhatsApp Business connection setup",
    });
  }
}

function getMetaSignupValue(signupData, keys) {
  const source = signupData && typeof signupData === "object" ? signupData : {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function getTokenExpiryDate(expiresIn) {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

async function completeMetaWhatsappConnection(req, res) {
  let record = null;

  try {
    record = await findVendorRecord(getAuthorizedVendorId(req));
    if (!record) return sendVendorNotFound(res);

    const current = normalizeWhatsappBusinessConfig(record.vendor.whatsappBusiness);
    await record.Model.updateOne(
      { _id: record.vendor._id },
      {
        $set: {
          whatsappBusiness: {
            ...current,
            enabled: false,
            provider: "msg91",
            connectionStatus: "connecting",
            lastError: "",
          },
        },
      }
    );

    const signupData = req.body?.signupData || {};
    const code = String(req.body?.code || req.body?.authCode || "").trim();
    const requestedWabaId = String(req.body?.wabaId || "").trim();
    const requestedPhoneNumberId = String(req.body?.phoneNumberId || "").trim();

    if (!code || !requestedWabaId || !requestedPhoneNumberId) {
      const error = new Error("Meta authorization code, WABA ID, and Phone Number ID are required");
      error.code = "meta_completion_payload_invalid";
      throw error;
    }

    const tokenResult = await exchangeEmbeddedSignupCode(code);
    const accessToken = String(tokenResult?.access_token || "").trim();

    const businessId = getMetaSignupValue(signupData, [
      "business_id",
      "businessId",
      "businessID",
    ]);
    const wabaId = requestedWabaId || getMetaSignupValue(signupData, [
      "waba_id",
      "wabaId",
      "whatsapp_business_account_id",
    ]);
    const phoneNumberId = requestedPhoneNumberId || getMetaSignupValue(signupData, [
      "phone_number_id",
      "phoneNumberId",
      "phoneID",
    ]);

    const validation = await validateConnection({
      accessToken,
      wabaId,
      phoneNumberId,
    });

    if (!validation.isValid) {
      const error = new Error("Meta WhatsApp connection could not be validated");
      error.code = "meta_connection_validation_failed";
      throw error;
    }

    const selectedPhone = validation.selectedPhone || {};
    const account = validation.account || {};
    const whatsappBusiness = {
      ...current,
      enabled: false,
      provider: "meta",
      connectionStatus: "connected",
      businessId,
      wabaId: String(account.id || wabaId),
      phoneNumberId: String(selectedPhone.id || phoneNumberId),
      displayPhoneNumber: selectedPhone.display_phone_number || "",
      displayName: selectedPhone.verified_name || account.name || "",
      templateStatus: "not_configured",
      connectedAt: new Date(),
      lastError: "",
      metaAuth: {
        accessTokenEncrypted: encryptMetaAccessToken(accessToken),
        tokenType: tokenResult?.token_type || "bearer",
        expiresAt: getTokenExpiryDate(tokenResult?.expires_in),
      },
    };

    await record.Model.updateOne(
      { _id: record.vendor._id },
      { $set: { whatsappBusiness } }
    );

    return res.json({
      success: true,
      data: sanitizeWhatsappBusinessConfig(whatsappBusiness),
      returnUrl: req.whatsappConnectAuth?.returnUrl || "",
      message: "WhatsApp Business connection completed",
    });
  } catch (error) {
    console.error("Failed to complete Meta WhatsApp connection:", error.code || error.message || error);

    if (record) {
      const current = normalizeWhatsappBusinessConfig(record.vendor.whatsappBusiness);
      await record.Model.updateOne(
        { _id: record.vendor._id },
        {
          $set: {
            whatsappBusiness: {
              ...current,
              enabled: false,
              provider: "msg91",
              connectionStatus: "error",
              lastError: error.code || error.message || "meta_connection_failed",
            },
          },
        }
      ).catch((updateError) => {
        console.error("Failed to persist Meta connection error:", updateError.message || updateError);
      });
    }

    const status = error.code === "meta_not_configured" ? 503 : 400;
    return res.status(status).json({
      success: false,
      message:
        "Your WhatsApp Business connection could not be completed. YNOT will continue sending bills from the YNOT WhatsApp number.",
      code: error.code || "meta_connection_failed",
    });
  }
}

async function disconnectWhatsappBusiness(req, res) {
  try {
    const record = await findVendorRecord(getAuthorizedVendorId(req));
    if (!record) return sendVendorNotFound(res);

    const whatsappBusiness = getDefaultWhatsappBusinessConfig();
    await record.Model.updateOne(
      { _id: record.vendor._id },
      { $set: { whatsappBusiness } }
    );

    return res.json({
      success: true,
      data: sanitizeWhatsappBusinessConfig(whatsappBusiness),
      message: "WhatsApp Business connection has been disconnected",
    });
  } catch (error) {
    console.error("Failed to disconnect WhatsApp Business:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect WhatsApp Business",
    });
  }
}

module.exports = {
  disconnectWhatsappBusiness,
  completeMetaWhatsappConnection,
  createMetaConnectSession,
  getMetaDiagnostics,
  getMetaEmbeddedSignupConfig,
  getWhatsappBusinessConfig,
  prepareWhatsappBusinessConnect,
  updateWhatsappBusinessConfig,
};
