// src/config.js
const ENV_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

const LOCAL_ENV_URL =
  process.env.REACT_APP_LOCAL_API_BASE_URL ||
  process.env.VITE_LOCAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL ||
  "";

const clean = (v) => (v ? v.trim().replace(/\/$/, "") : "");

const API_BASE_URL = (() => {
  try {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "";

    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (isLocal) {
      // ✅ LOCAL FIRST
      return clean(LOCAL_ENV_URL) || clean(ENV_URL);
    }

    // ✅ PROD / STAGING
    return clean(ENV_URL);
  } catch {
    return clean(ENV_URL);
  }
})();

/* 🔹 ADD THESE BACK */
export const PREVIEW_BASE_URL =
  process.env.REACT_APP_VENDOR_PREVIEW_ROOT_URL ||
  process.env.VITE_VENDOR_PREVIEW_ROOT_URL ||
  process.env.NEXT_PUBLIC_VENDOR_PREVIEW_ROOT_URL ||
  process.env.REACT_APP_PREVIEW_BASE_URL ||
  process.env.VITE_PREVIEW_BASE_URL ||
  process.env.NEXT_PUBLIC_PREVIEW_BASE_URL ||
  "";

export const NIKS_PREVIEW_BASE_URL =
  process.env.REACT_APP_NIKS_PREVIEW_BASE_URL ||
  process.env.VITE_NIKS_PREVIEW_BASE_URL ||
  process.env.NEXT_PUBLIC_NIKS_PREVIEW_BASE_URL ||
  "";

export default API_BASE_URL;
