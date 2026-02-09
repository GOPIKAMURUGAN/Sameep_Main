// preview-site/config.js
const isDev = process.env.NODE_ENV === "development";

export const API_BASE_URL = (() => {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_URL ||
    "";

  if (env && typeof env === "string" && env.trim()) {
    return env.trim().replace(/\/$/, "");
  }

  // 🔁 ONLY CHANGE: localhost → env var
  return isDev
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || "")
    : "https://newsameep-backend.go-kar.net";
})();

export const ASSET_BASE_URL = API_BASE_URL;

export default API_BASE_URL;
