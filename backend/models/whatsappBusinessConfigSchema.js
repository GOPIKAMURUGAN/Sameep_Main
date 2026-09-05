const mongoose = require("mongoose");

const WHATSAPP_BUSINESS_PROVIDERS = ["msg91", "meta"];

const WHATSAPP_BUSINESS_CONNECTION_STATUSES = [
  "not_connected",
  "connecting",
  "connected",
  "template_pending",
  "ready",
  "error",
];

const whatsappBusinessConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    provider: {
      type: String,
      enum: WHATSAPP_BUSINESS_PROVIDERS,
      default: "msg91",
    },
    connectionStatus: {
      type: String,
      enum: WHATSAPP_BUSINESS_CONNECTION_STATUSES,
      default: "not_connected",
    },
    businessId: { type: String, default: "" },
    wabaId: { type: String, default: "" },
    phoneNumberId: { type: String, default: "" },
    displayPhoneNumber: { type: String, default: "" },
    displayName: { type: String, default: "" },
    templateStatus: { type: String, default: "" },
    connectedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    metaAuth: {
      accessTokenEncrypted: { type: String, default: "" },
      tokenType: { type: String, default: "" },
      expiresAt: { type: Date, default: null },
    },
  },
  { _id: false }
);

function getDefaultWhatsappBusinessConfig() {
  return {
    enabled: false,
    provider: "msg91",
    connectionStatus: "not_connected",
    businessId: "",
    wabaId: "",
    phoneNumberId: "",
    displayPhoneNumber: "",
    displayName: "",
    templateStatus: "",
    connectedAt: null,
    lastError: "",
    metaAuth: {
      accessTokenEncrypted: "",
      tokenType: "",
      expiresAt: null,
    },
  };
}

module.exports = {
  WHATSAPP_BUSINESS_CONNECTION_STATUSES,
  WHATSAPP_BUSINESS_PROVIDERS,
  getDefaultWhatsappBusinessConfig,
  whatsappBusinessConfigSchema,
};
