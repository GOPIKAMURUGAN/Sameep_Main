const mongoose = require("mongoose");

const VendorWalletSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DummyVendor",
    required: true,
    unique: true,
    index: true,
  },
  whatsappBalance: {
    type: Number,
    default: 0,
  },
  otpBalance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

VendorWalletSchema.index({ vendorId: 1 });

module.exports = mongoose.model("VendorWallet", VendorWalletSchema);
