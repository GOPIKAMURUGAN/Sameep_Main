const BillingSession = require("../models/BillingSession");
const Transaction = require("../models/Transaction");
const VendorLoyaltyRule = require("../models/VendorLoyaltyRule");
const LoyaltyLedger = require("../models/LoyaltyLedger");


// ✅ Create Billing Session
exports.createBillingSession = async (req, res) => {
  try {
    const { vendorId, customerId } = req.body;

    const billing = await BillingSession.create({
      vendorId,
      customerId,
      cartItems: [],
      totalAmount: 0,
    });

    res.status(200).json({
      success: true,
      data: billing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create billing session" });
  }
};


// ✅ Update Cart
exports.updateBillingCart = async (req, res) => {
  try {
    const { billingId, cartItems } = req.body;

    let totalAmount = 0;

    cartItems.forEach((item) => {
      item.total = item.price * item.qty;
      totalAmount += item.total;
    });

    const updated = await BillingSession.findByIdAndUpdate(
      billingId,
      {
        cartItems,
        totalAmount,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update cart" });
  }
};


// ✅ Get Billing Session
exports.getBillingSession = async (req, res) => {
  try {
    const { id } = req.params;

    const billing = await BillingSession.findById(id);

    res.status(200).json({
      success: true,
      data: billing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch billing session" });
  }
};


// 🔐 Request OTP for Loyalty Redemption (DEMO VERSION)
exports.requestRedeemOTP = async (req, res) => {
  try {
    const { billingId, redeemPoints } = req.body;

    const billing = await BillingSession.findById(billingId);

    if (!billing || billing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Invalid billing session",
      });
    }

    const otp = "1234"; // demo otp

    billing.redeemRequested = redeemPoints;
    billing.otpVerified = false;

    await billing.save();

    res.status(200).json({
      success: true,
      message: "OTP sent (demo mode)",
      otp
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to request OTP",
    });
  }
};


// 🔐 Verify OTP
exports.verifyRedeemOTP = async (req, res) => {
  try {
    const { billingId, otp } = req.body;

    const billing = await BillingSession.findById(billingId);

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: "Billing not found",
      });
    }

    if (otp !== "1234") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    billing.otpVerified = true;
    await billing.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};


// ✅ Complete Billing WITH FIFO + OTP SAFETY
exports.completeBillingSession = async (req, res) => {
  try {
    const { billingId, paymentMode } = req.body;

    const billing = await BillingSession.findById(billingId);

    if (!billing || billing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Invalid billing session",
      });
    }

    // 🔐 OTP SAFETY CHECK
    if (billing.redeemRequested > 0 && !billing.otpVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required before redemption",
      });
    }

    // -------------------------
    // Create Transaction
    // -------------------------
    const transaction = await Transaction.create({
      vendorId: billing.vendorId,
      customerId: billing.customerId,
      totalAmount: billing.totalAmount,
      redeemedPoints: billing.redeemRequested || 0,
      redeemValue: billing.redeemRequested || 0,
      finalPaidAmount:
        billing.totalAmount - (billing.redeemRequested || 0),
      paymentMode,
      paymentStatus: "OFFLINE_PAID",
      billingSource: "POS_OFFLINE",
    });

    // -------------------------
    // FIFO Redemption
    // -------------------------
    let redeemLeft = billing.redeemRequested || 0;

    if (redeemLeft > 0) {
      const earns = await LoyaltyLedger.find({
        vendorId: billing.vendorId,
        customerId: billing.customerId,
        type: "EARN",
        remainingPoints: { $gt: 0 },
      }).sort({ expiryDate: 1, createdAt: 1 });

      for (const earn of earns) {
        if (redeemLeft <= 0) break;

        const deduct = Math.min(earn.remainingPoints, redeemLeft);

        earn.remainingPoints -= deduct;
        redeemLeft -= deduct;

        await earn.save();
      }

      await LoyaltyLedger.create({
        type: "REDEEM",
        vendorId: billing.vendorId,
        customerId: billing.customerId,
        transactionId: transaction._id,
        points: -(billing.redeemRequested || 0),
      });
    }

    // -------------------------
    // Earn Points
    // -------------------------
    const rule = await VendorLoyaltyRule.findOne({
      vendorId: billing.vendorId,
      isEnabled: true,
    });

    if (rule) {
      const blocks = Math.floor(transaction.finalPaidAmount / 100);
      const pointsEarned = blocks * rule.percentPer100;

      if (pointsEarned > 0) {
        let expiryDate = null;

        if (rule.expiryDays) {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + rule.expiryDays);
        }

        await LoyaltyLedger.create({
          type: "EARN",
          vendorId: billing.vendorId,
          customerId: billing.customerId,
          transactionId: transaction._id,
          points: pointsEarned,
          remainingPoints: pointsEarned,
          expiryDate,
        });
      }
    }

   // 🔒 Atomic completion lock (prevents double completion)
const closed = await BillingSession.findOneAndUpdate(
  { _id: billingId, status: "ACTIVE" },
  { status: "COMPLETED" },
  { new: true }
);

if (!closed) {
  return res.status(400).json({
    success: false,
    message: "Billing already completed or locked",
  });
}

    res.status(200).json({
      success: true,
      transaction,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to complete billing",
    });
  }
};
