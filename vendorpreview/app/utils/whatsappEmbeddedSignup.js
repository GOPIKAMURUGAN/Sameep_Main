export const META_EMBEDDED_SIGNUP_EVENT_TYPE = "WA_EMBEDDED_SIGNUP";
export const META_EMBEDDED_SIGNUP_EVENT_TYPE_MISSPELLING = "WA_EMEDDED_SIGNUP";
export const META_EMBEDDED_SIGNUP_ORIGIN = "https://www.facebook.com";

function parseMessageData(data) {
  if (typeof data !== "string") {
    return data && typeof data === "object" ? data : null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function parseMetaEmbeddedSignupMessage(event) {
  if (event?.origin !== META_EMBEDDED_SIGNUP_ORIGIN) {
    return null;
  }

  if (typeof event.data !== "string") {
    return null;
  }

  try {
    const payload = JSON.parse(event.data);
    return payload?.type === META_EMBEDDED_SIGNUP_EVENT_TYPE ? payload : null;
  } catch {
    return null;
  }
}

export function getMetaEmbeddedSignupDiagnostics(event) {
  const payload = parseMessageData(event?.data);
  const rawMessage = typeof event?.data === "string" ? event.data : "";
  const type = String(payload?.type || "");
  const isSignupRelated =
    type === META_EMBEDDED_SIGNUP_EVENT_TYPE ||
    type === META_EMBEDDED_SIGNUP_EVENT_TYPE_MISSPELLING ||
    rawMessage.includes(META_EMBEDDED_SIGNUP_EVENT_TYPE) ||
    rawMessage.includes(META_EMBEDDED_SIGNUP_EVENT_TYPE_MISSPELLING);

  if (!isSignupRelated) {
    return null;
  }

  const data = payload?.data && typeof payload.data === "object" ? payload.data : null;
  const sessionInfo = extractEmbeddedSignupSessionInfo(payload);

  return {
    origin: event?.origin || "",
    originAccepted: event?.origin === META_EMBEDDED_SIGNUP_ORIGIN,
    type: payload?.type || "",
    event: payload?.event || "",
    hasData: Boolean(data),
    dataFieldNames: data ? Object.keys(data) : [],
    wabaId: sessionInfo.wabaId || "",
    phoneNumberId: sessionInfo.phoneNumberId || "",
  };
}

function firstString(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

export function extractEmbeddedSignupSessionInfo(payload) {
  const data = payload?.data || payload || {};
  const phoneData =
    Array.isArray(data.phone_numbers) && data.phone_numbers.length
      ? data.phone_numbers[0]
      : {};

  return {
    businessId: firstString(data.business_id, data.businessId, data.businessID),
    wabaId: firstString(
      data.waba_id,
      data.wabaId,
      data.whatsapp_business_account_id,
      data.whatsappBusinessAccountId
    ),
    phoneNumberId: firstString(
      data.phone_number_id,
      data.phoneNumberId,
      data.phoneID,
      phoneData.id
    ),
  };
}

export function hasCompleteEmbeddedSignupResult({ code, sessionInfo }) {
  return Boolean(code && sessionInfo?.wabaId && sessionInfo?.phoneNumberId);
}
