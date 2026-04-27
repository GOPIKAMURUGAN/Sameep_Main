"use client";

function getOrCreateLocalStorageValue(key, prefix) {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.localStorage.setItem(key, next);
  return next;
}

function getOrCreateSessionStorageValue(key, prefix) {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function detectDeviceType() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    return "mobile";
  }
  return "desktop";
}

export function buildVendorPreviewPageViewPayload(vendorId) {
  if (typeof window === "undefined" || !vendorId) return null;
  const url = new URL(window.location.href);

  return {
    pageType: "vendor_preview",
    eventType: "page_view",
    vendorId: String(vendorId),
    visitorId: getOrCreateLocalStorageValue("ynotVisitorId", "visitor"),
    sessionId: getOrCreateSessionStorageValue("ynotSessionId", "session"),
    href: url.href,
    origin: url.origin,
    hostname: url.hostname,
    pathname: url.pathname,
    referrer: document.referrer || "",
    utmSource: url.searchParams.get("utm_source") || "",
    utmMedium: url.searchParams.get("utm_medium") || "",
    utmCampaign: url.searchParams.get("utm_campaign") || "",
    utmContent: url.searchParams.get("utm_content") || "",
    utmTerm: url.searchParams.get("utm_term") || "",
    gclid: url.searchParams.get("gclid") || "",
    fbclid: url.searchParams.get("fbclid") || "",
    msclkid: url.searchParams.get("msclkid") || "",
    deviceType: detectDeviceType(),
    userAgent: navigator.userAgent || "",
  };
}

export function buildVendorPreviewAnalyticsPayload({
  vendorId,
  eventType,
  meta = {},
}) {
  if (typeof window === "undefined" || !vendorId) return null;
  const url = new URL(window.location.href);

  return {
    pageType: "vendor_preview",
    eventType,
    vendorId: String(vendorId),
    visitorId: getOrCreateLocalStorageValue("ynotVisitorId", "visitor"),
    sessionId: getOrCreateSessionStorageValue("ynotSessionId", "session"),
    href: url.href,
    origin: url.origin,
    hostname: url.hostname,
    pathname: url.pathname,
    referrer: document.referrer || "",
    utmSource: url.searchParams.get("utm_source") || "",
    utmMedium: url.searchParams.get("utm_medium") || "",
    utmCampaign: url.searchParams.get("utm_campaign") || "",
    utmContent: url.searchParams.get("utm_content") || "",
    utmTerm: url.searchParams.get("utm_term") || "",
    gclid: url.searchParams.get("gclid") || "",
    fbclid: url.searchParams.get("fbclid") || "",
    msclkid: url.searchParams.get("msclkid") || "",
    deviceType: detectDeviceType(),
    userAgent: navigator.userAgent || "",
    ...meta,
  };
}

export function shouldTrackVendorPageViewOnce(vendorId) {
  if (typeof window === "undefined" || !vendorId) return false;
  const marker = `siteAnalyticsTracked:vendor:${vendorId}:${window.location.pathname}`;
  if (window.sessionStorage.getItem(marker)) return false;
  window.sessionStorage.setItem(marker, "1");
  return true;
}

export async function trackVendorPreviewPageView(apiBaseUrl, payload) {
  return trackVendorPreviewEvent(apiBaseUrl, payload);
}

export async function trackVendorPreviewEvent(apiBaseUrl, payload) {
  if (!apiBaseUrl || !payload) return;
  try {
    await fetch(`${apiBaseUrl}/api/site-analytics/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.error("Failed to track vendor preview analytics event", error);
  }
}
