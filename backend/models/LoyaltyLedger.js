const mongoose = require("mongoose");

const LoyaltyLedgerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["EARN", "REDEEM"],
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },

    points: {
      type: Number,
      required: true,
    },

    remainingPoints: {
      type: Number,
      default: null,
      index: true,
    },

    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

LoyaltyLedgerSchema.index({ vendorId: 1, customerId: 1 });
LoyaltyLedgerSchema.index({ transactionId: 1 });
LoyaltyLedgerSchema.index({ customerId: 1, expiryDate: 1 });

module.exports = mongoose.model("LoyaltyLedger", LoyaltyLedgerSchema);
