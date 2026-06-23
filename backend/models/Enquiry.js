const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  categoryId: { type: String, required: true },
  customerId: { type: String, default: '' },
  phone: { type: String, default: '' },
  categoryPath: { type: [String], default: [] },
  categoryIds: { type: [String], default: [] },
  serviceName: { type: String, default: '' },
  source: { type: String, default: '' },
  attributes: { type: Object, default: {} },
  price: { type: Number, default: null },
  terms: { type: String, default: '' },
  meta: { type: Object, default: {} },
  payment: {
    type: {
      provider: { type: String, default: "" },
      status: { type: String, default: "" },
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
  // current workflow status for this enquiry (label is per-category configurable)
  status: { type: String, default: '' },
  // full history of status changes for analytics
  statusHistory: {
    type: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Enquiry', EnquirySchema);
