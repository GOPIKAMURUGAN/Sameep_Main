const express = require("express");
const mongoose = require("mongoose");

const SiteAnalyticsEvent = require("../models/SiteAnalyticsEvent");
const DummyVendor = require("../models/DummyVendor");
const { requireAdminAuth } = require("../utils/adminAuthMiddleware");
const { validateVendorWriteRequest } = require("../utils/vendorWriteAuth");

const router = express.Router();
const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function normalizeText(value) {
  return String(value || "").trim();
}

function inferSourceLabel(referrer, utmSource) {
  if (utmSource) return normalizeText(utmSource).toLowerCase();
  const text = normalizeText(referrer);
  if (!text) return "direct";

  try {
    const host = new URL(text).hostname.toLowerCase();
    if (host.includes("google")) return "google";
    if (host.includes("facebook") || host.includes("fb")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("youtube")) return "youtube";
    if (host.includes("linkedin")) return "linkedin";
    return host;
  } catch {
    return "referral";
  }
}

function detectBrowser(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  return "Other";
}

function detectOs(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "Other";
}

function detectDeviceType(userAgent, providedDeviceType) {
  const direct = normalizeText(providedDeviceType).toLowerCase();
  if (direct) return direct;
  const ua = String(userAgent || "").toLowerCase();
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  return "desktop";
}

function startOfIstDay(date) {
  const shifted = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

function formatDateKey(value) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(value));
}

function buildExtraMatch(pageType, eventType) {
  const match = {};
  if (pageType) match.pageType = pageType;
  if (eventType) match.eventType = eventType;
  return match;
}

router.post("/track", async (req, res) => {
  try {
    const pageType = normalizeText(req.body?.pageType);
    const eventType = normalizeText(req.body?.eventType || "page_view");
    const vendorId = normalizeText(req.body?.vendorId);
    const userAgent =
      normalizeText(req.body?.userAgent) ||
      normalizeText(req.headers["user-agent"]);

    if (!["ynot_home", "vendor_preview"].includes(pageType)) {
      return res.status(400).json({ message: "Invalid pageType" });
    }

    if (!["page_view", "cta_click", "category_click", "enquiry_submit"].includes(eventType)) {
      return res.status(400).json({ message: "Invalid eventType" });
    }

    if (pageType === "vendor_preview" && vendorId && !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: "Invalid vendorId" });
    }

    const event = await SiteAnalyticsEvent.create({
      pageType,
      eventType,
      vendorId:
        pageType === "vendor_preview" && vendorId && mongoose.Types.ObjectId.isValid(vendorId)
          ? vendorId
          : null,
      visitorId: normalizeText(req.body?.visitorId),
      sessionId: normalizeText(req.body?.sessionId),
      href: normalizeText(req.body?.href),
      origin: normalizeText(req.body?.origin),
      hostname: normalizeText(req.body?.hostname),
      pathname: normalizeText(req.body?.pathname),
      referrer: normalizeText(req.body?.referrer),
      utmSource: normalizeText(req.body?.utmSource),
      utmMedium: normalizeText(req.body?.utmMedium),
      utmCampaign: normalizeText(req.body?.utmCampaign),
      utmContent: normalizeText(req.body?.utmContent),
      utmTerm: normalizeText(req.body?.utmTerm),
      gclid: normalizeText(req.body?.gclid),
      fbclid: normalizeText(req.body?.fbclid),
      msclkid: normalizeText(req.body?.msclkid),
      sourceLabel: inferSourceLabel(req.body?.referrer, req.body?.utmSource),
      browser: detectBrowser(userAgent),
      os: detectOs(userAgent),
      deviceType: detectDeviceType(userAgent, req.body?.deviceType),
      userAgent,
    });

    return res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    console.error("site analytics track error", error);
    return res.status(500).json({ message: "Failed to record analytics event" });
  }
});

router.get("/admin/summary", requireAdminAuth, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
    const since = startOfIstDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const baseMatch = {
      createdAt: { $gte: since },
      eventType: "page_view",
    };

    const [
      totalPageViews,
      ynotHomeViews,
      vendorPageViews,
      uniqueVisitorsDocs,
      homeUniqueDocs,
      vendorUniqueDocs,
      topSources,
      topCampaigns,
      dailyTrendRaw,
      topVendorPagesRaw,
      topVendorEnquiriesRaw,
      homeCtaClicks,
      vendorEnquirySubmissions,
      vendorCtaClicks,
    ] = await Promise.all([
      SiteAnalyticsEvent.countDocuments(baseMatch),
      SiteAnalyticsEvent.countDocuments({ ...baseMatch, pageType: "ynot_home" }),
      SiteAnalyticsEvent.countDocuments({ ...baseMatch, pageType: "vendor_preview" }),
      SiteAnalyticsEvent.distinct("visitorId", {
        ...baseMatch,
        visitorId: { $ne: "" },
      }),
      SiteAnalyticsEvent.distinct("visitorId", {
        ...baseMatch,
        pageType: "ynot_home",
        visitorId: { $ne: "" },
      }),
      SiteAnalyticsEvent.distinct("visitorId", {
        ...baseMatch,
        pageType: "vendor_preview",
        visitorId: { $ne: "" },
      }),
      SiteAnalyticsEvent.aggregate([
        { $match: baseMatch },
        { $group: { _id: { $ifNull: ["$sourceLabel", "direct"] }, views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      SiteAnalyticsEvent.aggregate([
        {
          $match: {
            ...baseMatch,
            utmCampaign: { $ne: "" },
          },
        },
        { $group: { _id: "$utmCampaign", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      SiteAnalyticsEvent.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: IST_TIMEZONE },
              },
              pageType: "$pageType",
            },
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorId" },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
      SiteAnalyticsEvent.aggregate([
        {
          $match: {
            ...baseMatch,
            pageType: "vendor_preview",
            vendorId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$vendorId",
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorId" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
      SiteAnalyticsEvent.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            pageType: "vendor_preview",
            eventType: "enquiry_submit",
            vendorId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$vendorId",
            enquiries: { $sum: 1 },
          },
        },
      ]),
      SiteAnalyticsEvent.countDocuments({
        createdAt: { $gte: since },
        ...buildExtraMatch("ynot_home", "cta_click"),
      }),
      SiteAnalyticsEvent.countDocuments({
        createdAt: { $gte: since },
        ...buildExtraMatch("vendor_preview", "enquiry_submit"),
      }),
      SiteAnalyticsEvent.countDocuments({
        createdAt: { $gte: since },
        ...buildExtraMatch("vendor_preview", "cta_click"),
      }),
    ]);

    const topVendorIds = topVendorPagesRaw
      .map((item) => String(item._id || ""))
      .filter(Boolean);
    const vendors = topVendorIds.length
      ? await DummyVendor.find({ _id: { $in: topVendorIds } })
          .select("businessName name homeLocation businessLocation city")
          .lean()
      : [];
    const vendorMap = new Map(
      vendors.map((vendor) => [
        String(vendor._id),
        vendor.businessName ||
          vendor.name ||
          vendor.businessLocation ||
          vendor.homeLocation ||
          "Vendor",
      ])
    );
    const vendorEnquiryMap = new Map(
      (topVendorEnquiriesRaw || []).map((item) => [String(item._id), item.enquiries || 0])
    );

    const trendByDate = new Map();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      trendByDate.set(formatDateKey(date), {
        date: formatDateKey(date),
        homeViews: 0,
        vendorViews: 0,
        uniqueVisitors: 0,
      });
    }

    dailyTrendRaw.forEach((item) => {
      const key = item?._id?.date;
      if (!trendByDate.has(key)) return;
      const entry = trendByDate.get(key);
      if (item?._id?.pageType === "ynot_home") {
        entry.homeViews = item.views || 0;
      } else if (item?._id?.pageType === "vendor_preview") {
        entry.vendorViews = item.views || 0;
      }
      entry.uniqueVisitors += (item.visitors || []).filter(Boolean).length;
    });

    return res.json({
      periodDays: days,
      overview: {
        totalPageViews,
        uniqueVisitors: uniqueVisitorsDocs.length,
        ynotHomeViews,
        ynotHomeUniqueVisitors: homeUniqueDocs.length,
        ynotHomeCtaClicks: homeCtaClicks,
        vendorPageViews,
        vendorPageUniqueVisitors: vendorUniqueDocs.length,
        vendorEnquirySubmissions,
        vendorCtaClicks,
      },
      topSources: topSources.map((item) => ({
        source: item._id || "direct",
        views: item.views || 0,
      })),
      topCampaigns: topCampaigns.map((item) => ({
        campaign: item._id || "Unknown",
        views: item.views || 0,
      })),
      dailyTrend: Array.from(trendByDate.values()),
      topVendorPages: topVendorPagesRaw.map((item) => ({
        vendorId: String(item._id),
        vendorName: vendorMap.get(String(item._id)) || "Vendor",
        views: item.views || 0,
        uniqueVisitors: (item.visitors || []).filter(Boolean).length,
        enquirySubmissions: vendorEnquiryMap.get(String(item._id)) || 0,
      })),
    });
  } catch (error) {
    console.error("site analytics summary error", error);
    return res.status(500).json({ message: "Failed to load analytics summary" });
  }
});

router.get("/vendor/summary", async (req, res) => {
  try {
    const vendorId = normalizeText(req.query.vendorId);
    const authResult = await validateVendorWriteRequest(req, vendorId);
    if (!authResult.ok) {
      return res.status(authResult.status || 403).json({
        message: authResult.message || "Vendor analytics access denied",
        code: authResult.code || "forbidden",
      });
    }

    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
    const since = startOfIstDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const baseMatch = {
      createdAt: { $gte: since },
      pageType: "vendor_preview",
      vendorId: new mongoose.Types.ObjectId(vendorId),
    };
    const pageViewMatch = {
      ...baseMatch,
      eventType: "page_view",
    };

    const [
      totalPageViews,
      uniqueVisitorsDocs,
      ctaClicks,
      enquirySubmissions,
      topSources,
      topCampaigns,
      dailyTrendRaw,
    ] = await Promise.all([
      SiteAnalyticsEvent.countDocuments(pageViewMatch),
      SiteAnalyticsEvent.distinct("visitorId", {
        ...pageViewMatch,
        visitorId: { $ne: "" },
      }),
      SiteAnalyticsEvent.countDocuments({
        ...baseMatch,
        eventType: "cta_click",
      }),
      SiteAnalyticsEvent.countDocuments({
        ...baseMatch,
        eventType: "enquiry_submit",
      }),
      SiteAnalyticsEvent.aggregate([
        { $match: pageViewMatch },
        { $group: { _id: { $ifNull: ["$sourceLabel", "direct"] }, views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      SiteAnalyticsEvent.aggregate([
        {
          $match: {
            ...pageViewMatch,
            utmCampaign: { $ne: "" },
          },
        },
        { $group: { _id: "$utmCampaign", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 8 },
      ]),
      SiteAnalyticsEvent.aggregate([
        { $match: pageViewMatch },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: IST_TIMEZONE },
              },
            },
            views: { $sum: 1 },
            visitors: { $addToSet: "$visitorId" },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
    ]);

    const trendByDate = new Map();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      trendByDate.set(formatDateKey(date), {
        date: formatDateKey(date),
        views: 0,
        uniqueVisitors: 0,
      });
    }

    dailyTrendRaw.forEach((item) => {
      const key = item?._id?.date;
      if (!trendByDate.has(key)) return;
      trendByDate.set(key, {
        date: key,
        views: item?.views || 0,
        uniqueVisitors: (item?.visitors || []).filter(Boolean).length,
      });
    });

    return res.json({
      periodDays: days,
      overview: {
        totalPageViews,
        uniqueVisitors: uniqueVisitorsDocs.length,
        ctaClicks,
        enquirySubmissions,
      },
      topSources: topSources.map((item) => ({
        source: item._id || "direct",
        views: item.views || 0,
      })),
      topCampaigns: topCampaigns.map((item) => ({
        campaign: item._id || "Unknown",
        views: item.views || 0,
      })),
      dailyTrend: Array.from(trendByDate.values()),
    });
  } catch (error) {
    console.error("vendor site analytics summary error", error);
    return res.status(500).json({ message: "Failed to load vendor analytics summary" });
  }
});

module.exports = router;
