const mongoose = require("mongoose");

const vendorPaymentConfigSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DummyVendor",
      required: true,
      unique: true,
      index: true,
    },
    paymentEnabled: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ["", "razorpay"],
      default: "",
    },
    razorpay: {
      accountName: { type: String, default: "", trim: true },
      mode: {
        type: String,
        enum: ["test", "live"],
        default: "test",
      },
      test: {
        keyId: { type: String, default: "", trim: true },
        keySecret: { type: String, default: "", trim: true },
      },
      live: {
        keyId: { type: String, default: "", trim: true },
        keySecret: { type: String, default: "", trim: true },
      },
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { minimize: false }
);

vendorPaymentConfigSchema.pre("save", function onSave(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("VendorPaymentConfig", vendorPaymentConfigSchema);
