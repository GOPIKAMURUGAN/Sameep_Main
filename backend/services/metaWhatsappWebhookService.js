const crypto = require("crypto");
const DummyVendor = require("../models/DummyVendor");
const Vendor = require("../models/Vendor");
const { getMetaWhatsAppConfig } = require("../config/metaWhatsAppConfig");

function verifyWebhookSignature({ rawBody, signature }) {
  const { appSecret } = getMetaWhatsAppConfig();
  const header = String(signature || "");

  if (!appSecret || !header) {
    return { verified: false, enforceable: false };
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody || "")
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(header);
  if (expectedBuffer.length !== actualBuffer.length) {
    return { verified: false, enforceable: true };
  }

  return {
    verified: crypto.timingSafeEqual(expectedBuffer, actualBuffer),
    enforceable: true,
  };
}

function extractWebhookMetadata(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const metadata = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      metadata.push({
        object: payload?.object || "",
        entryId: entry?.id || "",
        field: change?.field || "",
        wabaId: entry?.id || "",
        phoneNumberId: value?.metadata?.phone_number_id || "",
        statusCount: Array.isArray(value?.statuses) ? value.statuses.length : 0,
        messageCount: Array.isArray(value?.messages) ? value.messages.length : 0,
      });
    }
  }

  return metadata;
}

async function findVendorByMetaIdentifiers({ wabaId, phoneNumberId }) {
  const query = {
    $or: [
      ...(wabaId ? [{ "whatsappBusiness.wabaId": String(wabaId) }] : []),
      ...(phoneNumberId ? [{ "whatsappBusiness.phoneNumberId": String(phoneNumberId) }] : []),
    ],
  };

  if (!query.$or.length) return null;

  const dummyVendor = await DummyVendor.findOne(query).select("_id businessName").lean();
  if (dummyVendor) {
    return { collection: "DummyVendor", vendor: dummyVendor };
  }

  const vendor = await Vendor.findOne(query).select("_id businessName").lean();
  if (vendor) {
    return { collection: "Vendor", vendor };
  }

  return null;
}

async function processMetaWhatsappWebhook(payload) {
  const metadata = extractWebhookMetadata(payload);

  for (const item of metadata) {
    const vendorMatch = await findVendorByMetaIdentifiers({
      wabaId: item.wabaId,
      phoneNumberId: item.phoneNumberId,
    });

    if (!vendorMatch) {
      console.warn("Meta WhatsApp webhook has no vendor match", {
        wabaId: item.wabaId,
        phoneNumberId: item.phoneNumberId,
        field: item.field,
      });
      continue;
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("Meta WhatsApp webhook received", {
        vendorId: String(vendorMatch.vendor._id),
        collection: vendorMatch.collection,
        field: item.field,
        statusCount: item.statusCount,
        messageCount: item.messageCount,
      });
    }
  }

  return { processed: metadata.length };
}

module.exports = {
  extractWebhookMetadata,
  findVendorByMetaIdentifiers,
  processMetaWhatsappWebhook,
  verifyWebhookSignature,
};
