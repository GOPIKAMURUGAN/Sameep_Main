const mongoose = require("mongoose");

const SUPPORTED_LANGUAGES = ["english", "telugu", "hindi"];
const SECTIONS = [
  "Discovery",
  "Trust",
  "Information",
  "Conversion",
  "Retention",
];

const LocalizedTextSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true, default: "" },
    telugu: { type: String, trim: true, default: "" },
    hindi: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const DigitalScoreOptionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    scoreValue: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const DigitalScoreQuestionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    questionText: {
      type: LocalizedTextSchema,
      default: () => ({}),
    },
    options: {
      type: [DigitalScoreOptionSchema],
      default: [],
    },
    order: { type: Number, default: 0 },
    categoryApplicability: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    questionType: {
      type: String,
      enum: ["single_choice"],
      default: "single_choice",
    },
    section: {
      type: String,
      enum: SECTIONS,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DigitalScoreQuestion", DigitalScoreQuestionSchema);
