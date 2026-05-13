const VendorSubscription = require("../models/VendorSubscription");
const VendorWallet = require("../models/VendorWallet");
const { assignPlanToVendor } = require("../services/vendorSubscriptionService");

exports.assignVendorPlan = async (req, res) => {
  try {
    const { vendorId, planId, startDate, expiryDate, active } = req.body;
    const subscription = await assignPlanToVendor({
      vendorId,
      planId,
      startDate,
      expiryDate,
      active,
    });

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

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Vendor subscription not found",
      });
    }

    const wallet = await VendorWallet.findOne({ vendorId }).lean();

    let isActive = subscription.active;

    if (subscription.expiryDate && new Date(subscription.expiryDate) < new Date()) {
      isActive = false;
    }

    return res.json({
      success: true,
      data: {
        vendorId: subscription.vendorId,
        plan: subscription.planId,
        subscription: {
          startDate: subscription.startDate,
          expiryDate: subscription.expiryDate,
          active: isActive,
        },
        wallet: {
          whatsappBalance: wallet?.whatsappBalance || 0,
          otpBalance: wallet?.otpBalance || 0,
        },
      },
    });
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
    const { planId, expiryDate, active, startDate, whatsappBalance, otpBalance } = req.body;

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

    if (whatsappBalance !== undefined || otpBalance !== undefined) {
      const walletUpdate = {};

      if (whatsappBalance !== undefined) {
        walletUpdate.whatsappBalance = Math.max(0, Number(whatsappBalance) || 0);
      }

      if (otpBalance !== undefined) {
        walletUpdate.otpBalance = Math.max(0, Number(otpBalance) || 0);
      }

      walletUpdate.updatedAt = new Date();

      await VendorWallet.findOneAndUpdate(
        { vendorId },
        {
          $set: walletUpdate,
          $setOnInsert: { vendorId, createdAt: new Date() },
        },
        { new: true, upsert: true }
      );
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update vendor subscription error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update subscription",
    });
  }
};
