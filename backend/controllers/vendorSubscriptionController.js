const VendorSubscription = require("../models/VendorSubscription");
const Plan = require("../models/Plan");
const VendorWallet = require("../models/VendorWallet");
const VendorWalletLedger = require("../models/VendorWalletLedger");

exports.assignVendorPlan = async (req, res) => {
  try {
    const { vendorId, planId, startDate, expiryDate, active } = req.body;

    if (!vendorId || !planId) {
      return res.status(400).json({
        success: false,
        message: "vendorId and planId are required",
      });
    }

    const subscription = await VendorSubscription.findOneAndUpdate(
      { vendorId },
      {
        vendorId,
        planId,
        startDate: startDate || Date.now(),
        expiryDate,
        active: active !== undefined ? active : true,
      },
      { upsert: true, new: true }
    );

    const plan = await Plan.findById(planId).lean();

    let wallet = await VendorWallet.findOne({ vendorId });
    if (!wallet) {
      wallet = await VendorWallet.create({
        vendorId,
        whatsappBalance: 0,
        otpBalance: 0,
      });
    }

    if (plan?.features?.whatsappBundle > 0) {
      wallet.whatsappBalance += plan.features.whatsappBundle;

      await VendorWalletLedger.create({
        vendorId,
        type: "PLAN_ALLOCATION",
        channel: "WHATSAPP",
        quantity: plan.features.whatsappBundle,
        reference: plan._id.toString(),
        balanceAfter: wallet.whatsappBalance,
      });
    }

    if (plan?.features?.otpBundle > 0) {
      wallet.otpBalance += plan.features.otpBundle;

      await VendorWalletLedger.create({
        vendorId,
        type: "PLAN_ALLOCATION",
        channel: "OTP",
        quantity: plan.features.otpBundle,
        reference: plan._id.toString(),
        balanceAfter: wallet.otpBalance,
      });
    }

    wallet.updatedAt = new Date();
    await wallet.save();

    return res.json({ success: true, data: subscription });
  } catch (err) {
    console.error("Assign vendor plan error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to assign plan",
    });
  }
};

exports.getVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const subscription = await VendorSubscription.findOne({ vendorId })
      .populate("planId")
      .lean();

    return res.json({ success: true, data: subscription });
  } catch (err) {
    console.error("Get vendor subscription error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subscription",
    });
  }
};

exports.updateVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { planId, expiryDate, active, startDate } = req.body;

    const updated = await VendorSubscription.findOneAndUpdate(
      { vendorId },
      {
        ...(planId ? { planId } : {}),
        ...(expiryDate !== undefined ? { expiryDate } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
      },
      { new: true }
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update vendor subscription error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update subscription",
    });
  }
};
