const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const TOKEN_EXPIRES_IN = "15m";

function createWhatsappConnectToken({ vendorId, customerId, returnUrl }) {
  return jwt.sign(
    {
      purpose: "whatsapp_business_connect",
      vendorId: String(vendorId || ""),
      customerId: String(customerId || ""),
      returnUrl: String(returnUrl || ""),
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function verifyWhatsappConnectToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    return { ok: false, code: "missing_connect_token" };
  }

  try {
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    if (decoded?.purpose !== "whatsapp_business_connect" || !decoded?.vendorId) {
      return { ok: false, code: "invalid_connect_token" };
    }

    return {
      ok: true,
      vendorId: String(decoded.vendorId),
      customerId: decoded.customerId ? String(decoded.customerId) : "",
      returnUrl: decoded.returnUrl ? String(decoded.returnUrl) : "",
    };
  } catch {
    return { ok: false, code: "invalid_or_expired_connect_token" };
  }
}

module.exports = {
  createWhatsappConnectToken,
  verifyWhatsappConnectToken,
};
