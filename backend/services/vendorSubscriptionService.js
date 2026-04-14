const VendorSubscription = require("../models/VendorSubscription");
const Plan = require("../models/Plan");
const VendorWallet = require("../models/VendorWallet");
const VendorWalletLedger = require("../models/VendorWalletLedger");

function calculateExpiryDate(plan, startDate, expiryDate) {
  if (expiryDate) return expiryDate;

  const finalStartDate = startDate ? new Date(startDate) : new Date();
  const finalExpiryDate = new Date(finalStartDate);

  if (plan?.billingCycle === "yearly") {
    finalExpiryDate.setFullYear(finalExpiryDate.getFullYear() + 1);
    return finalExpiryDate;
  }

  if (plan?.billingCycle === "monthly") {
    finalExpiryDate.setMonth(finalExpiryDate.getMonth() + 1);
    return finalExpiryDate;
  }

  if (plan?.billingCycle === "daily") {
    finalExpiryDate.setDate(finalExpiryDate.getDate() + 1);
    return finalExpiryDate;
  }

  return undefined;
}

async function assignPlanToVendor({
  vendorId,
  planId,
  startDate,
  expiryDate,
  active,
}) {
  if (!vendorId || !planId) {
    throw new Error("vendorId and planId are required");
  }

  const plan = await Plan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  const finalStartDate = startDate ? new Date(startDate) : new Date();
  const finalExpiryDate = calculateExpiryDate(plan, finalStartDate, expiryDate);

  const subscription = await VendorSubscription.findOneAndUpdate(
    { vendorId },
    {
      vendorId,
      planId,
      startDate: finalStartDate,
      expiryDate: finalExpiryDate,
      active: active !== undefined ? active : true,
    },
    { upsert: true, new: true }
  );

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

  return subscription;
}

module.exports = {
  assignPlanToVendor,
  calculateExpiryDate,
};
