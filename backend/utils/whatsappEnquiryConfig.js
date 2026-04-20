const AppConfig = require("../models/AppConfig");

function normalizeWhatsAppEnquiryConfig(value) {
  const config = value && typeof value === "object" ? value : {};

  return {
    enabled: config.enabled === undefined ? true : Boolean(config.enabled),
    templateName:
      typeof config.templateName === "string" ? config.templateName.trim() : "",
    language:
      typeof config.language === "string" ? config.language.trim() : "",
    body:
      typeof config.body === "string"
        ? config.body.trim()
        : "You have received a new enquiry. Open Dashboard > Enquiries to review the details and respond.",
  };
}

async function getStoredWhatsAppEnquiryConfig() {
  const doc = await AppConfig.findOne({ key: "whatsAppEnquiryConfig" }).lean();
  return normalizeWhatsAppEnquiryConfig(doc?.value);
}

async function getWhatsAppEnquiryConfig() {
  const stored = await getStoredWhatsAppEnquiryConfig();

  return {
    enabled: stored.enabled,
    templateName:
      stored.templateName ||
      process.env.MSG91_VENDOR_ENQUIRY_TEMPLATE_NAME ||
      "vendor_enquiry",
    language:
      stored.language ||
      process.env.MSG91_VENDOR_ENQUIRY_TEMPLATE_LANGUAGE ||
      "en",
    body:
      stored.body ||
      "You have received a new enquiry. Open Dashboard > Enquiries to review the details and respond.",
  };
}

module.exports = {
  getStoredWhatsAppEnquiryConfig,
  getWhatsAppEnquiryConfig,
  normalizeWhatsAppEnquiryConfig,
};
