const mongoose = require("mongoose");

const VendorLoyaltyRuleSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    percentPer100: {
      type: Number,
      required: true,
    },

    expiryDays: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VendorLoyaltyRule",
  VendorLoyaltyRuleSchema
);
