const axios = require("axios");
const BillingSession = require("../models/BillingSession");
const Transaction = require("../models/Transaction");
const VendorLoyaltyRule = require("../models/VendorLoyaltyRule");
const LoyaltyLedger = require("../models/LoyaltyLedger");
const Customer = require("../models/Customer");


// ✅ Create Billing Session
exports.createBillingSession = async (req, res) => {
  try {
    const { vendorId, customerId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID required",
      });
    }

    const billing = await BillingSession.create({
      vendorId,
      customerId: customerId || null,
      billingMode: customerId ? "LOYALTY" : "WALK_IN",
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


// 🔐 Request OTP for Loyalty Redemption (MSG91)
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

    if (!billing.customerId) {
      return res.status(400).json({
        success: false,
        message: "Loyalty redemption requires customer",
      });
    }

    const customer = await Customer.findById(billing.customerId);
    const mobile = customer?.fullNumber;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Customer mobile not found",
      });
    }

    await axios.post(
      "https://control.msg91.com/api/v5/otp",
      {
        mobile,
        otp_length: 6,
        sender: process.env.MSG91_SENDER,
        template_id: "63e1e445d6fc0560d933a5e2",
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTHKEY,
          "Content-Type": "application/json",
        },
      }
    );

    billing.pointsRedeemed = redeemPoints;
    billing.otpVerified = false;

    await billing.save();

    res.status(200).json({
      success: true,
      message: "OTP sent via MSG91",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to request OTP",
    });
  }
};


// 🔐 Verify OTP (MSG91)
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

    const customer = await Customer.findById(billing.customerId);
    const mobile = customer?.fullNumber;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Customer mobile not found",
      });
    }

    try {
      await axios.post(
        "https://control.msg91.com/api/v5/otp/verify",
        {
          mobile,
          otp,
        },
        {
          headers: {
            authkey: process.env.MSG91_AUTHKEY,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (verifyErr) {
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

    const isWalkIn = !billing.customerId;

    // 🔐 OTP SAFETY CHECK
    if (!isWalkIn && billing.pointsRedeemed > 0 && !billing.otpVerified) {
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
      customerId: billing.customerId || null,
      totalAmount: billing.totalAmount,
      redeemedPoints: billing.pointsRedeemed || 0,
      redeemValue: billing.pointsRedeemed || 0,
      finalPaidAmount:
        billing.totalAmount - (billing.pointsRedeemed || 0),
      paymentMode,
      paymentStatus: "OFFLINE_PAID",
      billingSource: "POS_OFFLINE",
    });

    // -------------------------
    // FIFO Redemption
    // -------------------------
    let redeemLeft = billing.pointsRedeemed || 0;

    if (!isWalkIn && redeemLeft > 0) {
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
        points: -(billing.pointsRedeemed || 0),
      });
    }

    // -------------------------
    // Earn Points
    // -------------------------
    let rule = null;
    if (!isWalkIn) {
      rule = await VendorLoyaltyRule.findOne({
        vendorId: billing.vendorId,
        isEnabled: true,
      });
    }

    if (!isWalkIn && rule) {
      const totalAmount = transaction.finalPaidAmount;
      const earnPercent = rule?.earn?.percentPer100 ?? 0;
      let earnedPoints = 0;

      if (
        typeof totalAmount === "number" &&
        totalAmount > 0 &&
        typeof earnPercent === "number" &&
        earnPercent > 0
      ) {
        earnedPoints = Math.floor((totalAmount / 100) * earnPercent);
      }

      billing.pointsEarned = Number.isFinite(earnedPoints)
        ? earnedPoints
        : 0;

      if (billing.pointsEarned > 0) {
        let expiryDate = null;

        if (rule?.expiry?.expiryDays) {
          expiryDate = new Date();
          expiryDate.setDate(
            expiryDate.getDate() + rule.expiry.expiryDays
          );
        }

        await LoyaltyLedger.create({
          type: "EARN",
          vendorId: billing.vendorId,
          customerId: billing.customerId,
          transactionId: transaction._id,
          points: billing.pointsEarned,
          remainingPoints: billing.pointsEarned,
          expiryDate,
        });
      }
    }

   // 🔒 Atomic completion lock (prevents double completion)
    if (isWalkIn) {
      billing.pointsEarned = 0;
      billing.pointsRedeemed = 0;
    }

    await billing.save();

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
      type: isWalkIn ? "WALK_IN" : "CUSTOMER",
      message: isWalkIn ? "Walk-in bill generated" : "Bill generated",
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
