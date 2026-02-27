const mongoose = require("mongoose");

const vendorTrustProfileSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
    },

    // ⭐ NEW DYNAMIC STORAGE
    answers: {
      type: Object,
      default: {},
    },

    experienceStartYear: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorTrustProfile", vendorTrustProfileSchema);
