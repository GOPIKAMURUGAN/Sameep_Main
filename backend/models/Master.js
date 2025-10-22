// Master schema definition (supports typed masters like brand, fuelType, etc.)
const mongoose = require("mongoose");

const MasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Logical grouping, e.g., brand, fuelType, transmission, bikeBrand, tempoBusBrand
    type: { type: String, required: true, trim: true },

    // Optional parent-child relationship between master entries (rarely used)
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Master", default: null },

    imageUrl: { type: String, default: null },
    sequence: { type: Number, default: 0 },

    // Optional UI/input metadata for masters that are form-driven
    fieldType: { type: String, default: null },
    options: { type: [String], default: [] },
    autoCalc: { type: Boolean, default: false },

    visibleToUser: { type: Boolean, default: true },
    visibleToVendor: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Uniqueness within parent (legacy usage)
MasterSchema.index({ name: 1, parent: 1 }, { unique: true });
// Enforce unique names within the same type (current usage)
MasterSchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Master", MasterSchema);
