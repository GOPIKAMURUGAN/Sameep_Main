const mongoose = require("mongoose");

const BillingItemSchema = new mongoose.Schema(
  {
    itemId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    qty: Number,
    total: Number,

    // ⭐ NEW — hierarchy fields for analytics
    categoryId: mongoose.Schema.Types.ObjectId,
    parentCategoryId: mongoose.Schema.Types.ObjectId,
    rootCategoryId: mongoose.Schema.Types.ObjectId,
    nodePath: [String],
    categoryPathIds: [mongoose.Schema.Types.ObjectId],

    // ⭐ Resource assignment
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorResource",
      default: null,
    },
    resourceName: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);


const BillingSessionSchema = new mongoose.Schema(
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
      required: false,
      default: null,
    },

    billingMode: {
      type: String,
      enum: ["LOYALTY", "WALK_IN"],
      default: "WALK_IN",
    },

    cartItems: [BillingItemSchema],

    totalAmount: {
      type: Number,
      default: 0,
    },

    pointsEarned: {
      type: Number,
      default: 0,
    },

    pointsRedeemed: {
      type: Number,
      default: 0,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

BillingSessionSchema.index({ vendorId: 1, createdAt: -1 });
BillingSessionSchema.index({ customerId: 1 });

module.exports = mongoose.model("BillingSession", BillingSessionSchema);
