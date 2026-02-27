const LoyaltyLedger = require("../models/LoyaltyLedger");
const VendorLoyaltyRule = require("../models/VendorLoyaltyRule");


// ✅ Create or Update Vendor Loyalty Rule
exports.upsertVendorRule = async (req, res) => {
  try {
    const { vendorId, percentPer100, expiryDays } = req.body;

    const rule = await VendorLoyaltyRule.findOneAndUpdate(
      { vendorId },
      {
        vendorId,
        percentPer100,
        expiryDays,
        isEnabled: true,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save rule" });
  }
};


// ✅ Get Vendor Loyalty Rule
exports.getVendorRule = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const rule = await VendorLoyaltyRule.findOne({ vendorId });

    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch rule" });
  }
};


// ✅ Wallet API (Expiry-aware)
exports.getWallet = async (req, res) => {
  try {
    const { customerId, vendorId } = req.query;

    const now = new Date();

    const earns = await LoyaltyLedger.find({
      customerId,
      vendorId,
      type: "EARN",
      remainingPoints: { $gt: 0 },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ],
    });

    let availablePoints = 0;

    earns.forEach((e) => {
      availablePoints += e.remainingPoints || 0;
    });

    res.status(200).json({
      success: true,
      availablePoints,
      entries: earns,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet",
    });
  }
};
