export function getVendorToken(vendorId) {
  if (typeof window === "undefined" || !vendorId) return "";
  return localStorage.getItem(`vendorToken:${vendorId}`) || "";
}

export function getVendorAuthHeaders(vendorId) {
  const token = getVendorToken(vendorId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
