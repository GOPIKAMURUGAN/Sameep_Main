const mongoose = require("mongoose");

const TrustQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["years", "range", "select", "multi_select", "boolean", "text", "number"],
    },
    options: [{ type: String, trim: true }],
    placeholder: { type: String, trim: true },
    helperText: { type: String, trim: true },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const TrustQuestionnaireConfigSchema = new mongoose.Schema(
  {
    clusterKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    categoryIds: [{ type: String, trim: true }],
    categoryNames: [{ type: String, trim: true }],
    questions: {
      type: [TrustQuestionSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "TrustQuestionnaireConfig",
  TrustQuestionnaireConfigSchema
);
