const axios = require("axios");
const { getMetaWhatsAppConfig } = require("../config/metaWhatsAppConfig");

function graphUrl(path) {
  const { graphApiVersion } = getMetaWhatsAppConfig();
  return `https://graph.facebook.com/${graphApiVersion}/${path.replace(/^\//, "")}`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Meta request failed"
  );
}

function getSafeMetaError(error) {
  const metaError = error?.response?.data?.error || {};
  return {
    code: metaError.code || error?.code || "",
    type: metaError.type || "",
    message: metaError.message || error?.message || "Meta request failed",
  };
}

function ensureTokenExchangeConfig() {
  const config = getMetaWhatsAppConfig();
  if (!config.isTokenExchangeConfigured) {
    const error = new Error("Meta Embedded Signup is not configured");
    error.code = "meta_not_configured";
    throw error;
  }

  return config;
}

async function exchangeEmbeddedSignupCode(code) {
  const config = ensureTokenExchangeConfig();
  const authorizationCode = String(code || "").trim();

  if (!authorizationCode) {
    const error = new Error("Meta authorization code is required");
    error.code = "meta_code_required";
    throw error;
  }

  try {
    const params = {
      client_id: config.appId,
      client_secret: config.appSecret,
      code: authorizationCode,
    };

    if (config.redirectUri) {
      params.redirect_uri = config.redirectUri;
    }

    const response = await axios.get(graphUrl("/oauth/access_token"), { params });
    return response.data || {};
  } catch (error) {
    console.error("Meta authorization code exchange failed:", getErrorMessage(error));
    const wrapped = new Error("Unable to complete Meta authorization");
    wrapped.code = "meta_code_exchange_failed";
    throw wrapped;
  }
}

async function getAuthorizedBusinesses(accessToken) {
  if (!accessToken) return [];

  try {
    const response = await axios.get(graphUrl("/me/businesses"), {
      params: {
        fields: "id,name",
        access_token: accessToken,
      },
    });

    return Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.error("Meta businesses lookup failed:", getErrorMessage(error));
    return [];
  }
}

async function getWhatsAppBusinessAccount(wabaId, accessToken) {
  const id = String(wabaId || "").trim();
  if (!id || !accessToken) return null;

  try {
    const response = await axios.get(graphUrl(id), {
      params: {
        fields: "id,name,message_template_namespace",
        access_token: accessToken,
      },
    });

    return response.data || null;
  } catch (error) {
    console.error("Meta WABA lookup failed:", getErrorMessage(error));
    return null;
  }
}

async function getPhoneNumbers(wabaId, accessToken) {
  const id = String(wabaId || "").trim();
  if (!id || !accessToken) return [];

  try {
    const response = await axios.get(graphUrl(`${id}/phone_numbers`), {
      params: {
        fields: "id,display_phone_number,verified_name",
        access_token: accessToken,
      },
    });

    return Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.error("Meta phone numbers lookup failed:", getErrorMessage(error));
    return [];
  }
}

async function validateConnection({ accessToken, wabaId, phoneNumberId }) {
  const account = await getWhatsAppBusinessAccount(wabaId, accessToken);
  const phoneNumbers = await getPhoneNumbers(wabaId, accessToken);
  const selectedPhone =
    phoneNumbers.find((phone) => String(phone.id) === String(phoneNumberId)) ||
    phoneNumbers[0] ||
    null;

  return {
    account,
    phoneNumbers,
    selectedPhone,
    isValid: Boolean(account?.id && selectedPhone?.id),
  };
}

async function runMetaConfigurationDiagnostics() {
  const config = getMetaWhatsAppConfig();
  const result = {
    configured: Boolean(
      config.appId &&
        config.appSecret &&
        config.embeddedSignupConfigId &&
        config.systemUserAccessToken &&
        config.graphApiVersion &&
        config.webhookVerifyToken
    ),
    config: {
      appId: Boolean(config.appId),
      appSecret: Boolean(config.appSecret),
      configId: Boolean(config.embeddedSignupConfigId),
      systemUserToken: Boolean(config.systemUserAccessToken),
      graphApiVersion: config.graphApiVersion,
      webhookVerifyToken: Boolean(config.webhookVerifyToken),
    },
    metaApiReachable: false,
    systemUserTokenValid: false,
    appMatchesExpected: false,
    metaError: null,
  };

  if (!config.systemUserAccessToken) {
    result.metaError = {
      code: "missing_system_user_token",
      message: "META_SYSTEM_USER_ACCESS_TOKEN is not configured",
    };
    return result;
  }

  try {
    const response = await axios.get(graphUrl("/me"), {
      params: {
        fields: "id,name",
        access_token: config.systemUserAccessToken,
      },
    });

    result.metaApiReachable = true;
    result.systemUserTokenValid = Boolean(response.data?.id);
  } catch (error) {
    if (error.response) {
      result.metaApiReachable = true;
    }
    result.metaError = getSafeMetaError(error);
  }

  if (config.appId && config.appSecret) {
    try {
      const response = await axios.get(graphUrl(config.appId), {
        params: {
          fields: "id,name",
          access_token: `${config.appId}|${config.appSecret}`,
        },
      });
      result.appMatchesExpected = String(response.data?.id || "") === String(config.appId);
    } catch (error) {
      result.appValidationError = getSafeMetaError(error);
    }
  }

  return result;
}

async function disconnectAuthorization() {
  // Keep external Meta assets intact. Revocation can be wired here later if YNOT
  // receives a token model where revocation is required and safe.
  return { revoked: false, reason: "not_implemented" };
}

async function subscribeAppToWaba() {
  throw new Error("subscribeAppToWaba is reserved for the Meta onboarding phase that requires it.");
}

async function registerPhoneNumber() {
  throw new Error("registerPhoneNumber is reserved for the Meta onboarding phase that requires it.");
}

async function sendTemplateMessage() {
  throw new Error("sendTemplateMessage is reserved for Phase 4 provider routing.");
}

async function createTemplate() {
  throw new Error("createTemplate is reserved for Phase 3 template setup.");
}

async function getTemplateStatus() {
  throw new Error("getTemplateStatus is reserved for Phase 3 template setup.");
}

module.exports = {
  createTemplate,
  disconnectAuthorization,
  getAuthorizedBusinesses,
  getPhoneNumbers,
  getTemplateStatus,
  getWhatsAppBusinessAccount,
  registerPhoneNumber,
  runMetaConfigurationDiagnostics,
  sendTemplateMessage,
  subscribeAppToWaba,
  validateConnection,
  exchangeEmbeddedSignupCode,
};
