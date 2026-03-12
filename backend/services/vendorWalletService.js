const VendorWallet = require("../models/VendorWallet");
const VendorWalletLedger = require("../models/VendorWalletLedger");

async function deductWhatsApp(vendorId, reference) {
  const wallet = await VendorWallet.findOne({ vendorId });

  if (!wallet) {
    throw new Error("Vendor wallet not found");
  }

  if (wallet.whatsappBalance <= 0) {
    throw new Error("Insufficient WhatsApp balance");
  }

  wallet.whatsappBalance -= 1;
  await wallet.save();

  await VendorWalletLedger.create({
    vendorId,
    type: "BILL_MESSAGE",
    channel: "WHATSAPP",
    quantity: -1,
    reference,
    balanceAfter: wallet.whatsappBalance,
  });

  return wallet.whatsappBalance;
}

async function deductOTP(vendorId, reference) {
  const wallet = await VendorWallet.findOne({ vendorId });

  if (!wallet) {
    throw new Error("Vendor wallet not found");
  }

  if (wallet.otpBalance <= 0) {
    throw new Error("Insufficient OTP balance");
  }

  wallet.otpBalance -= 1;
  await wallet.save();

  await VendorWalletLedger.create({
    vendorId,
    type: "OTP_USAGE",
    channel: "OTP",
    quantity: -1,
    reference,
    balanceAfter: wallet.otpBalance,
  });

  return wallet.otpBalance;
}

module.exports = {
  deductWhatsApp,
  deductOTP,
};
