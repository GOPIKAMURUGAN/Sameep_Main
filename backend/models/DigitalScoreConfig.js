const mongoose = require("mongoose");

const SUPPORTED_LANGUAGES = ["english", "telugu", "hindi"];

const LocalizedTextSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true, default: "" },
    telugu: { type: String, trim: true, default: "" },
    hindi: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const DigitalScoreRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0, max: 100 },
    max: { type: Number, required: true, min: 0, max: 100 },
    key: {
      type: String,
      required: true,
      trim: true,
      enum: ["poor", "average", "good", "excellent"],
    },
    label: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const DigitalScoreConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: "digital-score",
      index: true,
    },
    isEnabled: { type: Boolean, default: true },
    supportedLanguages: {
      type: [String],
      enum: SUPPORTED_LANGUAGES,
      default: ["english"],
    },
    defaultLanguage: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      default: "english",
    },
    title: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    subtitle: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    ctaText: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    resultScreenText: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    scoreRanges: {
      type: [DigitalScoreRangeSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DigitalScoreConfig", DigitalScoreConfigSchema);
