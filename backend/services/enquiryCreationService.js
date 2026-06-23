const Enquiry = require("../models/Enquiry");
const DummyVendor = require("../models/DummyVendor");
const { sendVendorEnquiryWhatsapp, normalizeWhatsAppMobile } = require("../utils/whatsappService");
const { deductWhatsApp } = require("./vendorWalletService");

async function sendVendorWhatsappForEnquiry(doc, vendorId) {
  try {
    const vendor = await DummyVendor.findById(vendorId).lean();
    const vendorMobile = vendor?.phone ? String(vendor.phone).trim() : "";
    const normalizedVendorMobile = normalizeWhatsAppMobile(vendorMobile);

    if (!normalizedVendorMobile) {
      await Enquiry.findByIdAndUpdate(doc._id, {
        $set: {
          "meta.vendorWhatsappStatus": "skipped",
          "meta.vendorWhatsappError": "Vendor phone not found",
        },
      });
      return;
    }

    const response = await sendVendorEnquiryWhatsapp({
      mobile: normalizedVendorMobile,
    });

    if (response?.skipped) {
      await Enquiry.findByIdAndUpdate(doc._id, {
        $set: {
          "meta.vendorWhatsappTemplate": "vendor_enquiry",
          "meta.vendorWhatsappStatus": "skipped",
          "meta.vendorWhatsappError": response.reason || "Skipped",
        },
      });
      return;
    }

    await deductWhatsApp(String(vendorId), `enquiry:${doc._id}`);

    const responseId =
      response?.data?.message_id ||
      response?.message_id ||
      response?.id ||
      "";

    await Enquiry.findByIdAndUpdate(doc._id, {
      $set: {
        "meta.vendorWhatsappTemplate": "vendor_enquiry",
        "meta.vendorWhatsappSentAt": new Date(),
        "meta.vendorWhatsappStatus": "sent",
        "meta.vendorWhatsappMessageId": responseId ? String(responseId) : "",
        "meta.vendorWhatsappRecipient": normalizedVendorMobile,
        "meta.vendorWhatsappError": "",
      },
    });
  } catch (sendError) {
    console.error("Vendor enquiry WhatsApp send failed:", sendError?.message || sendError);
    await Enquiry.findByIdAndUpdate(doc._id, {
      $set: {
        "meta.vendorWhatsappTemplate": "vendor_enquiry",
        "meta.vendorWhatsappStatus": "failed",
        "meta.vendorWhatsappError": String(sendError?.message || sendError || "Unknown error"),
      },
    }).catch(() => {});
  }
}

async function createEnquiryAndNotify(payload) {
  const doc = await Enquiry.create(payload);

  setImmediate(() => {
    sendVendorWhatsappForEnquiry(doc, payload.vendorId);
  });

  return doc;
}

module.exports = {
  createEnquiryAndNotify,
};
