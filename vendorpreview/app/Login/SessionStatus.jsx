import { API_BASE_URL } from "../../config";

export async function checkSessionStatus(token) {
  try {
    const res = await fetch(
      `${ process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/session-status-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}
