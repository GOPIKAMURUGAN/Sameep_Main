"use client";

export const ADMIN_OPEN_MENU_EVENT = "ynot-admin-open-menu";
export const ADMIN_OPEN_DASHBOARD_EVENT = "ynot-admin-open-dashboard";

function dispatchAdminEvent(eventName) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventName));
}

export function openAdminMenu() {
  dispatchAdminEvent(ADMIN_OPEN_MENU_EVENT);
}

export function openAdminDashboard() {
  dispatchAdminEvent(ADMIN_OPEN_DASHBOARD_EVENT);
}
