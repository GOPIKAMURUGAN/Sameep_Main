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

    earn: {
      type: {
        type: String,
        enum: ["PERCENT_PER_BILL"],
        default: "PERCENT_PER_BILL",
      },
      percentPer100: {
        type: Number,
        default: 0,
      },
    },

    redeem: {
      allowPartial: {
        type: Boolean,
        default: false,
      },
      maxPercentPerBill: {
        type: Number,
        default: null,
      },
    },

    expiry: {
      expiryDays: {
        type: Number,
        default: null,
      },
    },

    rounding: {
      type: String,
      enum: ["FLOOR", "ROUND", "CEIL"],
      default: "FLOOR",
    },

    minBillAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VendorLoyaltyRule",
  VendorLoyaltyRuleSchema
);
