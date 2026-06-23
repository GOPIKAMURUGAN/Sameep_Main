const mongoose = require("mongoose");

const CheckoutAttemptSchema = new mongoose.Schema(
  {
    vendorId: { type: String, required: true },
    categoryId: { type: String, required: true },
    customerId: { type: String, default: "" },
    phone: { type: String, default: "" },
    categoryPath: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    serviceName: { type: String, default: "" },
    source: { type: String, default: "" },
    attributes: { type: Object, default: {} },
    price: { type: Number, default: null },
    terms: { type: String, default: "" },
    meta: { type: Object, default: {} },
    payment: {
      type: {
        provider: { type: String, default: "razorpay" },
        status: { type: String, default: "initialized" },
        amount: { type: Number, default: null },
        currency: { type: String, default: "INR" },
        ynotOrderId: { type: String, default: "" },
        razorpayOrderId: { type: String, default: "" },
        razorpayPaymentId: { type: String, default: "" },
        razorpaySignature: { type: String, default: "" },
        paidAt: { type: Date, default: null },
        lastError: { type: String, default: "" },
        notes: { type: Object, default: {} },
      },
      default: {},
    },
    status: { type: String, default: "Initialized" },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    finalEnquiryId: { type: String, default: "" },
    finalizedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CheckoutAttempt", CheckoutAttemptSchema);
