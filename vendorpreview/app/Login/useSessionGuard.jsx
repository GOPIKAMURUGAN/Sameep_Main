"use client";

import { useEffect } from "react";

const SESSION_CHECK_INTERVAL_MS = 30000;

const guardState = {
  refCount: 0,
  intervalId: null,
  logoutTimerId: null,
  visibilityHandler: null,
  focusHandler: null,
  storageHandler: null,
  sessionCheckInFlight: false,
  setupTimerInFlight: false,
};

const clearLogoutTimer = () => {
  if (guardState.logoutTimerId) {
    clearTimeout(guardState.logoutTimerId);
    guardState.logoutTimerId = null;
  }
};

const clearSessionStorage = () => {
  localStorage.removeItem("authToken");
 Object.keys(localStorage).forEach((key) => {
  if (key.startsWith("vendorToken:")) {
    localStorage.removeItem(key);
  }
});
  localStorage.removeItem("userData");
  localStorage.removeItem("loginTime");
  localStorage.removeItem("authLoginTime");
  localStorage.removeItem("vendorLoginTime");
  localStorage.removeItem("vendorSessionVendorId");
  localStorage.removeItem("sessionDeviceId");
  localStorage.removeItem("sessionHour");
};

const getSessionToken = () => {
  const authToken = localStorage.getItem("authToken");

  if (authToken) return authToken;

  // 🔥 get active vendorId
  const vendorId = localStorage.getItem("vendorSessionVendorId");

  if (vendorId) {
    return localStorage.getItem(`vendorToken:${vendorId}`);
  }

  return null;
};

const notifySessionExpired = (reason) => {
  window.dispatchEvent(
    new CustomEvent("session-expired", { detail: { reason } })
  );
};

const getStoredLoginTimeMs = () => {
  const raw =
    localStorage.getItem("loginTime") ||
    localStorage.getItem("authLoginTime") ||
    localStorage.getItem("vendorLoginTime");
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return null;

  if (!localStorage.getItem("loginTime")) {
    localStorage.setItem("loginTime", String(ms));
  }

  return ms;
};

const forceLogout = () => {
  console.warn("Session expired -> logging out");

  clearSessionStorage();
  clearLogoutTimer();
  window.dispatchEvent(new Event("storage"));
  notifySessionExpired("expired");
};

const checkSession = async () => {
  if (guardState.sessionCheckInFlight) return;
  guardState.sessionCheckInFlight = true;

  try {
    const token = getSessionToken();
    if (!token) return;

    console.log("Checking session API...");

    const deviceId = localStorage.getItem("deviceId");
   const vendorId = localStorage.getItem("vendorSessionVendorId");

const body = deviceId
  ? { token, deviceId, vendorId }
  : { token, vendorId };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/session-status-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (res.status === 401 || res.status === 403) {
      console.warn("Session invalid");
      clearSessionStorage();
      clearLogoutTimer();
      window.dispatchEvent(new Event("storage"));
      notifySessionExpired("invalid");
    } else if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.status !== "active") {
        console.warn("Session inactive");
        clearSessionStorage();
        clearLogoutTimer();
        window.dispatchEvent(new Event("storage"));
        notifySessionExpired("inactive");
      }
    } else if (!res.ok) {
      console.warn("Session check failed");
    }
  } catch {
    console.warn("API check failed");
  } finally {
    guardState.sessionCheckInFlight = false;
  }
};

const setupSessionTimer = async () => {
  if (guardState.setupTimerInFlight) return;
  guardState.setupTimerInFlight = true;

  try {
    const token = getSessionToken();
    if (!token) {
      clearLogoutTimer();
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/app-config/session-validity`
    );

    let selectedHour = null;

    if (res.ok) {
      const data = await res.json();
      const selectedHourRaw = data?.selectedHour;
      const parsedHour = Number(selectedHourRaw);
      if (Number.isFinite(parsedHour) && parsedHour > 0) {
        selectedHour = parsedHour;
        localStorage.setItem("sessionHour", String(parsedHour));
      }
    }

    if (!Number.isFinite(selectedHour) || selectedHour <= 0) {
      const storedHour = Number(localStorage.getItem("sessionHour"));
      if (Number.isFinite(storedHour) && storedHour > 0) {
        selectedHour = storedHour;
      } else {
        return;
      }
    }

    const sessionDuration = selectedHour * 60 * 60 * 1000;

    console.log("Session duration (ms):", sessionDuration);

    let loginTimeMs = getStoredLoginTimeMs();
    if (!loginTimeMs) {
      loginTimeMs = Date.now();
      localStorage.setItem("loginTime", String(loginTimeMs));
    }

    const remainingTime = sessionDuration - (Date.now() - loginTimeMs);

    if (remainingTime <= 0) {
      forceLogout();
      return;
    }

    clearLogoutTimer();
    guardState.logoutTimerId = setTimeout(forceLogout, remainingTime);
  } catch {
    console.warn("Failed to setup session timer");
  } finally {
    guardState.setupTimerInFlight = false;
  }
};

const startSessionGuard = () => {
  if (guardState.intervalId) return;

  checkSession();
  guardState.intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);

  setupSessionTimer();

  guardState.visibilityHandler = () => {
    if (document.visibilityState === "visible") {
      checkSession();
      setupSessionTimer();
    }
  };
  guardState.focusHandler = () => {
    checkSession();
    setupSessionTimer();
  };
  guardState.storageHandler = () => {
    checkSession();
    setupSessionTimer();
  };

  document.addEventListener("visibilitychange", guardState.visibilityHandler);
  window.addEventListener("focus", guardState.focusHandler);
  window.addEventListener("storage", guardState.storageHandler);
};

const stopSessionGuard = () => {
  if (guardState.intervalId) {
    clearInterval(guardState.intervalId);
    guardState.intervalId = null;
  }

  clearLogoutTimer();

  if (guardState.visibilityHandler) {
    document.removeEventListener(
      "visibilitychange",
      guardState.visibilityHandler
    );
    guardState.visibilityHandler = null;
  }

  if (guardState.focusHandler) {
    window.removeEventListener("focus", guardState.focusHandler);
    guardState.focusHandler = null;
  }

  if (guardState.storageHandler) {
    window.removeEventListener("storage", guardState.storageHandler);
    guardState.storageHandler = null;
  }
};

export function useSessionGuard() {
  useEffect(() => {
    let deviceId = localStorage.getItem("deviceId");

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }

    const sessionDeviceId = localStorage.getItem("sessionDeviceId");
   const vendorId = localStorage.getItem("vendorSessionVendorId");

const token = vendorId
  ? localStorage.getItem(`vendorToken:${vendorId}`)
  : null;

    if (token && (!sessionDeviceId || deviceId !== sessionDeviceId)) {
      console.warn("Device mismatch -> logout");

     Object.keys(localStorage).forEach((key) => {
  if (key.startsWith("vendorToken:")) {
    localStorage.removeItem(key);
  }
});
      localStorage.removeItem("vendorLoginTime");
      localStorage.removeItem("vendorSessionVendorId");
      localStorage.removeItem("sessionDeviceId");

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("session-expired"));
    }
  }, []);

  useEffect(() => {
    guardState.refCount += 1;
    if (!guardState.intervalId) {
      startSessionGuard();
    }

    return () => {
      guardState.refCount -= 1;
      if (guardState.refCount <= 0) {
        guardState.refCount = 0;
        stopSessionGuard();
      }
    };
  }, []);
}