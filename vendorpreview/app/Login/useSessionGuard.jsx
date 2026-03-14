"use client";

import { useEffect } from "react";
export function useSessionGuard() {
  useEffect(() => {
    const forceLogout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.dispatchEvent(new Event("storage"));
    };

    const checkSession = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const user = localStorage.getItem("userData");
      const parsedUser = user ? JSON.parse(user) : null;

      // Skip backend customer session check for admin impersonation
      if (parsedUser?.isAdmin) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/session-status-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        if (res.status === 401 || res.status === 403) {
          forceLogout();
        }
      } catch {
        // Ignore transient failures; interval will retry
      }
    };

    const onFocus = () => {
      checkSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}


