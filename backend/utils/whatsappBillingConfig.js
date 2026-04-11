const AppConfig = require("../models/AppConfig");

const WHATSAPP_BILLING_VARIABLES = [
  "customerName",
  "vendorName",
  "billAmount",
  "earned",
  "redeemed",
  "finalPaid",
  "balance",
  "billUrl",
  "billPath",
];

const TEMPLATE_PROFILE_PRESETS = {
  legacy_7_param: {
    bodyVariables: [
      "customerName",
      "vendorName",
      "billAmount",
      "earned",
      "redeemed",
      "finalPaid",
      "balance",
    ],
    buttonUrlVariable: "",
  },
  bill_url_7_param: {
    bodyVariables: [
      "vendorName",
      "billAmount",
      "earned",
      "redeemed",
      "finalPaid",
      "balance",
      "billUrl",
    ],
    buttonUrlVariable: "",
  },
  view_bill_dynamic_url: {
    bodyVariables: [
      "vendorName",
      "billAmount",
      "earned",
      "redeemed",
      "finalPaid",
      "balance",
    ],
    buttonUrlVariable: "billPath",
  },
};

function normalizeVariableName(value) {
  const variable = typeof value === "string" ? value.trim() : "";
  return WHATSAPP_BILLING_VARIABLES.includes(variable) ? variable : "";
}

function getPresetForProfile(profile) {
  return TEMPLATE_PROFILE_PRESETS[profile] || TEMPLATE_PROFILE_PRESETS.legacy_7_param;
}

function getAllowedTemplateProfiles() {
  return Object.keys(TEMPLATE_PROFILE_PRESETS);
}

function normalizeWhatsAppBillingConfig(value) {
  const config = value && typeof value === "object" ? value : {};
  const requestedProfile =
    typeof config.templateProfile === "string" ? config.templateProfile.trim() : "";
  const templateProfile = getAllowedTemplateProfiles().includes(requestedProfile)
    ? requestedProfile
    : "legacy_7_param";
  const preset = getPresetForProfile(templateProfile);
  const bodyVariables = Array.isArray(config.bodyVariables)
    ? config.bodyVariables.map(normalizeVariableName).filter(Boolean)
    : [];
  const normalizedBodyVariables =
    bodyVariables.length > 0 ? bodyVariables : preset.bodyVariables.slice();
  const buttonUrlVariable = normalizeVariableName(config.buttonUrlVariable) || preset.buttonUrlVariable;

  return {
    templateProfile,
    templateName:
      typeof config.templateName === "string" ? config.templateName.trim() : "",
    language:
      typeof config.language === "string" ? config.language.trim() : "",
    buttonIndex:
      config.buttonIndex === 0 || config.buttonIndex === "0"
        ? 0
        : Number.isFinite(Number(config.buttonIndex))
        ? Number(config.buttonIndex)
        : 0,
    publicBillBaseUrl:
      typeof config.publicBillBaseUrl === "string"
        ? config.publicBillBaseUrl.trim().replace(/\/$/, "")
        : "",
    ttlDays: Number.isFinite(Number(config.ttlDays)) ? Number(config.ttlDays) : null,
    bodyVariables: normalizedBodyVariables,
    buttonUrlVariable,
  };
}

async function getStoredWhatsAppBillingConfig() {
  const doc = await AppConfig.findOne({ key: "whatsAppBillingConfig" }).lean();
  return normalizeWhatsAppBillingConfig(doc?.value);
}

async function getWhatsAppBillingConfig() {
  const stored = await getStoredWhatsAppBillingConfig();
  const preset = getPresetForProfile(stored.templateProfile);

  return {
    templateProfile: stored.templateProfile || "legacy_7_param",
    templateName:
      stored.templateName ||
      process.env.MSG91_BILL_TEMPLATE_NAME ||
      "bill",
    language:
      stored.language ||
      process.env.MSG91_BILL_TEMPLATE_LANGUAGE ||
      "en",
    buttonIndex:
      Number.isFinite(stored.buttonIndex)
        ? stored.buttonIndex
        : Number(process.env.MSG91_BILL_TEMPLATE_BUTTON_INDEX || 0),
    publicBillBaseUrl:
      stored.publicBillBaseUrl ||
      process.env.VENDOR_PREVIEW_ROOT_URL ||
      process.env.NEXT_PUBLIC_VENDOR_PREVIEW_ROOT_URL ||
      process.env.REACT_APP_VENDOR_PREVIEW_ROOT_URL ||
      process.env.NEXT_PUBLIC_HARISH_PREVIEW_BASE_URL ||
      process.env.PUBLIC_BILL_BASE_URL ||
      process.env.PREVIEW_BASE_URL ||
      process.env.REACT_APP_PREVIEW_BASE_URL ||
      process.env.NEXT_PUBLIC_PREVIEW_BASE_URL ||
      "",
    ttlDays:
      Number.isFinite(stored.ttlDays) && stored.ttlDays > 0
        ? stored.ttlDays
        : Number(process.env.BILL_LINK_TTL_DAYS || 30),
    bodyVariables:
      Array.isArray(stored.bodyVariables) && stored.bodyVariables.length > 0
        ? stored.bodyVariables
        : preset.bodyVariables.slice(),
    buttonUrlVariable:
      stored.buttonUrlVariable || preset.buttonUrlVariable,
  };
}

module.exports = {
  WHATSAPP_BILLING_VARIABLES,
  getAllowedTemplateProfiles,
  getStoredWhatsAppBillingConfig,
  getWhatsAppBillingConfig,
  normalizeVariableName,
  normalizeWhatsAppBillingConfig,
};
