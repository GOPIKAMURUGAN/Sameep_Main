import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL = String(extra.apiBaseUrl || "http://localhost:5001");
export const PREVIEW_BASE_URL = String(extra.previewBaseUrl || "https://sameep.app");
