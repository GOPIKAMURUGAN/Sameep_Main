const mongoose = require("mongoose");

const DigitalScoreAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    questionKey: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    prompt: { type: String, trim: true, default: "" },
    selectedOptionKey: { type: String, required: true, trim: true },
    selectedOptionLabel: { type: String, trim: true, default: "" },
    scoreValue: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DigitalScoreSubmissionSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    selectedLanguage: {
      type: String,
      required: true,
      trim: true,
      enum: ["english", "telugu", "hindi"],
      default: "english",
    },
    answers: {
      type: [DigitalScoreAnswerSchema],
      default: [],
    },
    totalScore: { type: Number, required: true, min: 0, max: 100 },
    discoveryScore: { type: Number, required: true, min: 0, max: 100 },
    trustScore: { type: Number, required: true, min: 0, max: 100 },
    informationScore: { type: Number, required: true, min: 0, max: 100 },
    conversionScore: { type: Number, required: true, min: 0, max: 100 },
    retentionScore: { type: Number, required: true, min: 0, max: 100 },
    resultLevel: {
      type: String,
      required: true,
      trim: true,
      enum: ["Poor", "Average", "Good", "Excellent"],
    },
    recommendations: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DigitalScoreSubmission",
  DigitalScoreSubmissionSchema
);
