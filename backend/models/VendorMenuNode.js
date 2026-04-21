const mongoose = require("mongoose");

const VendorMenuNodeSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    parentNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: Number,
      required: true,
      min: 1,
    },

    isLeaf: {
      type: Boolean,
      required: true,
      default: false,
    },

    price: {
      type: Number,
      default: null,
    },

    pricingStatus: {
      type: String,
      enum: ["Active", "Inactive", "Archive"],
      default: "Inactive",
    },

    visibleToUser: {
      type: Boolean,
      default: true,
    },

    visibleToVendor: {
      type: Boolean,
      default: true,
    },

    terms: {
      type: String,
      default: "",
    },

    packagesIncludes: {
      type: String,
      default: "",
    },

    offerText: {
      type: String,
      default: "",
    },

    inventoryLabelName: {
      type: String,
      default: "",
    },

    parentSelectorLabel: {
      type: String,
      default: "",
    },

    sequence: {
      type: Number,
      default: 0,
    },

    enableFreeText: {
      type: Boolean,
      default: false,
    },

    freeText: {
      type: String,
      default: "",
    },

    imageUrl: {
      type: String,
      default: "",
    },

    iconUrl: {
      type: String,
      default: "",
    },

    sourceType: {
      type: String,
      enum: ["excel_upload", "pdf_upload", "manual_upload"],
      required: true,
    },

    uploadBatchId: {
      type: String,
      required: true,
      index: true,
    },

    datasetStatus: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },

    pathNames: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

VendorMenuNodeSchema.index(
  { vendorId: 1, datasetStatus: 1, parentNodeId: 1, sequence: 1 },
  { name: "vendor_menu_tree_idx" }
);

VendorMenuNodeSchema.index(
  { vendorId: 1, uploadBatchId: 1, pathNames: 1, datasetStatus: 1 },
  { name: "vendor_menu_batch_path_idx" }
);

module.exports = mongoose.model("VendorMenuNode", VendorMenuNodeSchema);
