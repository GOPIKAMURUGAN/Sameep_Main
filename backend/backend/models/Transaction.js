const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
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

    totalAmount: Number,

    redeemedPoints: Number,
    redeemValue: Number,

    finalPaidAmount: Number,

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "CARD"],
    },

    paymentStatus: {
      type: String,
      default: "OFFLINE_PAID",
    },

    billingSource: {
      type: String,
      default: "POS_OFFLINE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
