const express = require("express");
const mongoose = require("mongoose");
const DummyVendor = require("../models/DummyVendor");
const VendorPaymentConfig = require("../models/VendorPaymentConfig");

const router = express.Router();

function maskSecret(value) {
  const secret = String(value || "").trim();
  if (!secret) return "";
  if (secret.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}`;
}

function getModeScopedCredentials(config, modeOverride = "") {
  const mode = String(modeOverride || config?.razorpay?.mode || "test").trim().toLowerCase() === "live" ? "live" : "test";
  const scoped = config?.razorpay?.[mode] || {};
  const fallbackKeyId = String(config?.razorpay?.keyId || "").trim();
  const fallbackKeySecret = String(config?.razorpay?.keySecret || "").trim();

  return {
    mode,
    keyId: String(scoped?.keyId || fallbackKeyId || ""),
    keySecret: String(scoped?.keySecret || fallbackKeySecret || ""),
  };
}

function sanitizePaymentConfig(doc) {
  const config = doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {};
  const active = getModeScopedCredentials(config);
  const test = getModeScopedCredentials(config, "test");
  const live = getModeScopedCredentials(config, "live");

  return {
    paymentEnabled: Boolean(config.paymentEnabled),
    provider: String(config.provider || ""),
    razorpay: {
      accountName: String(config?.razorpay?.accountName || ""),
      mode: active.mode,
      keyId: active.keyId,
      keySecretMasked: maskSecret(active.keySecret),
      hasKeySecret: Boolean(active.keySecret),
      environments: {
        test: {
          keyId: test.keyId,
          keySecretMasked: maskSecret(test.keySecret),
          hasKeySecret: Boolean(test.keySecret),
        },
        live: {
          keyId: live.keyId,
          keySecretMasked: maskSecret(live.keySecret),
          hasKeySecret: Boolean(live.keySecret),
        },
      },
    },
    updatedAt: config?.updatedAt || null,
  };
}

router.get("/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: "Invalid vendorId" });
    }

    const vendor = await DummyVendor.findById(vendorId).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const config = await VendorPaymentConfig.findOne({ vendorId }).lean();
    return res.json({
      success: true,
      vendorId,
      config: sanitizePaymentConfig(config),
    });
  } catch (err) {
    console.error("GET /vendor-payment-config/:vendorId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: "Invalid vendorId" });
    }

    const vendor = await DummyVendor.findById(vendorId).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const paymentEnabled = Boolean(req.body?.paymentEnabled);
    const provider = String(req.body?.provider || "").trim().toLowerCase() === "razorpay" ? "razorpay" : "";
    const accountName = String(req.body?.razorpay?.accountName || "").trim();
    const mode = String(req.body?.razorpay?.mode || "").trim().toLowerCase() === "live" ? "live" : "test";
    const incomingTestKeyId = String(req.body?.razorpay?.environments?.test?.keyId || "").trim();
    const incomingTestKeySecret = String(req.body?.razorpay?.environments?.test?.keySecret || "").trim();
    const incomingLiveKeyId = String(req.body?.razorpay?.environments?.live?.keyId || "").trim();
    const incomingLiveKeySecret = String(req.body?.razorpay?.environments?.live?.keySecret || "").trim();

    const existing = await VendorPaymentConfig.findOne({ vendorId });
    const nextDoc = existing || new VendorPaymentConfig({ vendorId });
    const existingTest = getModeScopedCredentials(existing || {}, "test");
    const existingLive = getModeScopedCredentials(existing || {}, "live");

    nextDoc.paymentEnabled = paymentEnabled;
    nextDoc.provider = provider;
    nextDoc.razorpay = {
      accountName,
      mode,
      test: {
        keyId: incomingTestKeyId,
        keySecret: incomingTestKeySecret || existingTest.keySecret,
      },
      live: {
        keyId: incomingLiveKeyId,
        keySecret: incomingLiveKeySecret || existingLive.keySecret,
      },
    };

    await nextDoc.save();

    return res.json({
      success: true,
      vendorId,
      config: sanitizePaymentConfig(nextDoc),
    });
  } catch (err) {
    console.error("PUT /vendor-payment-config/:vendorId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
