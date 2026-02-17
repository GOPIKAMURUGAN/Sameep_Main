"use client";

import { useEffect } from "react";
import { checkSessionStatus } from "./SessionStatus";
export function useSessionGuard() {
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("userData");
    const parsedUser = user ? JSON.parse(user) : null;

    if (!token) return;

    // 🚨 Skip backend session check for admin
    if (parsedUser?.isAdmin) return;

    const forceLogout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.dispatchEvent(new Event("storage"));
    };

    const checkSession = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/session-status-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        if (!res.ok) {
          forceLogout();
        }
      } catch {
        forceLogout();
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60_000);

    return () => clearInterval(interval);
  }, []);
}
