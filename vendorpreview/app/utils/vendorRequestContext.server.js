import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

function isLocalHost(host) {
  return /(^|\.)localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/i.test(host);
}

function getSubdomain(host) {
  const cleanHost = String(host || "").split(":")[0];
  const parts = cleanHost.split(".").filter(Boolean);
  if (parts.length >= 2 && /^localhost$/i.test(parts[parts.length - 1])) {
    return parts[0] || null;
  }
  if (parts.length < 3) return null;
  return parts[0] || null;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

export const resolveVendorRequestContext = cache(async function resolveVendorRequestContext() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    "";
  const protocol =
    headerList.get("x-forwarded-proto") ||
    (isLocalHost(host) ? "http" : "https");
  const referer = headerList.get("referer") || "";
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "";

  const pageUrl = host ? `${protocol}://${host}` : "";
  const subdomain = getSubdomain(host);
  const isPreviewHost = !subdomain;

  let vendorContext = null;
  let previewVendorId = "";

  if (base && subdomain) {
    vendorContext = await fetchJson(`${base}/api/vendor/by-subdomain/${subdomain}`);
  }

  if (!vendorContext && referer) {
    try {
      const refererUrl = new URL(referer);
      previewVendorId = String(refererUrl.searchParams.get("vendorId") || "").trim();
      if (base && previewVendorId) {
        vendorContext = await fetchJson(`${base}/api/dummy-vendors/${previewVendorId}`);
      }
    } catch {
      previewVendorId = "";
    }
  }

  return {
    vendorContext,
    host,
    protocol,
    pageUrl,
    subdomain,
    previewVendorId,
    isPreviewHost,
    isIndexable: Boolean(vendorContext && subdomain && !isLocalHost(host)),
  };
});
