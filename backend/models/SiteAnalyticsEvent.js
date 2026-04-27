const mongoose = require("mongoose");

const SiteAnalyticsEventSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      enum: ["ynot_home", "vendor_preview"],
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["page_view", "cta_click", "category_click", "enquiry_submit"],
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DummyVendor",
      default: null,
      index: true,
    },
    visitorId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    href: {
      type: String,
      trim: true,
      default: "",
    },
    origin: {
      type: String,
      trim: true,
      default: "",
    },
    hostname: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    pathname: {
      type: String,
      trim: true,
      default: "",
    },
    referrer: {
      type: String,
      trim: true,
      default: "",
    },
    utmSource: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    utmMedium: {
      type: String,
      trim: true,
      default: "",
    },
    utmCampaign: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    utmContent: {
      type: String,
      trim: true,
      default: "",
    },
    utmTerm: {
      type: String,
      trim: true,
      default: "",
    },
    gclid: {
      type: String,
      trim: true,
      default: "",
    },
    fbclid: {
      type: String,
      trim: true,
      default: "",
    },
    msclkid: {
      type: String,
      trim: true,
      default: "",
    },
    sourceLabel: {
      type: String,
      trim: true,
      default: "direct",
      index: true,
    },
    browser: {
      type: String,
      trim: true,
      default: "",
    },
    os: {
      type: String,
      trim: true,
      default: "",
    },
    deviceType: {
      type: String,
      trim: true,
      default: "desktop",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

SiteAnalyticsEventSchema.index({ createdAt: -1, pageType: 1, eventType: 1 });
SiteAnalyticsEventSchema.index({ vendorId: 1, createdAt: -1 });
SiteAnalyticsEventSchema.index({ pageType: 1, visitorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.SiteAnalyticsEvent ||
  mongoose.model("SiteAnalyticsEvent", SiteAnalyticsEventSchema);
