const mongoose = require("mongoose");

const galleryImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    caption: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    sequence: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const vendorGalleryAlbumSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DummyVendor",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    coverImageUrl: { type: String, default: "", trim: true },
    sequence: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sourceType: {
      type: String,
      enum: ["system_default", "vendor_created", "admin_created"],
      default: "vendor_created",
    },
    images: { type: [galleryImageSchema], default: [] },
  },
  { timestamps: true }
);

vendorGalleryAlbumSchema.index({ vendorId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("VendorGalleryAlbum", vendorGalleryAlbumSchema);
