const crypto = require("crypto");
const { getMetaWhatsAppConfig } = require("../config/metaWhatsAppConfig");

function getEncryptionKey() {
  const { tokenEncryptionKey } = getMetaWhatsAppConfig();
  if (!tokenEncryptionKey) return null;

  return crypto.createHash("sha256").update(tokenEncryptionKey).digest();
}

function encryptMetaAccessToken(accessToken) {
  const token = String(accessToken || "");
  const key = getEncryptionKey();

  if (!token) {
    return "";
  }

  if (!key) {
    const error = new Error("Meta token encryption is not configured");
    error.code = "meta_token_encryption_missing";
    throw error;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function decryptMetaAccessToken(encryptedToken) {
  const value = String(encryptedToken || "");
  const key = getEncryptionKey();

  if (!value) return "";
  if (!key) {
    const error = new Error("Meta token encryption is not configured");
    error.code = "meta_token_encryption_missing";
    throw error;
  }

  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted Meta token format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivRaw, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

module.exports = {
  decryptMetaAccessToken,
  encryptMetaAccessToken,
};
