"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";
import "./WhatsappBusinessDashboard.css";

const CONNECTED_STATUSES = new Set(["connected", "template_pending", "ready"]);

function getVendorAuthToken(vendorId) {
  if (typeof window === "undefined") return "";

  const vendorToken = vendorId ? localStorage.getItem(`vendorToken:${vendorId}`) : "";
  return (
    vendorToken ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getAuthHeaders(vendorId) {
  const token = getVendorAuthToken(vendorId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseApiResponse(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.success) {
    const message = json?.message || fallbackMessage;
    console.error("WhatsApp Business API error", {
      status: res.status,
      statusText: res.statusText,
      message,
      code: json?.code,
    });
    throw new Error(`${message} (${res.status})`);
  }

  return json;
}

function formatStatus(value) {
  return String(value || "not_connected")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(status) {
  if (status === "ready" || status === "connected") return "ready";
  if (status === "template_pending" || status === "connecting") return "pending";
  if (status === "error") return "error";
  return "idle";
}

function getWhatsappConnectBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_WHATSAPP_CONNECT_BASE_URL;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

function getHasWhatsappConnectLauncher() {
  return Boolean(getWhatsappConnectBaseUrl());
}

export default function WhatsappBusinessDashboard({ vendorId }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (!vendorId) {
        setLoading(false);
        setConfig(null);
        setError("Vendor session was not found. Please log in again.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const configRes = await fetch(
          `${API_BASE_URL}/api/vendor/whatsapp-business?vendorId=${encodeURIComponent(vendorId)}`,
          {
            cache: "no-store",
            headers: getAuthHeaders(vendorId),
          }
        );

        const json = await parseApiResponse(
          configRes,
          "Unable to load WhatsApp Business settings"
        );

        if (!cancelled) {
          setConfig(json.data || null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("WhatsApp Business settings fetch failed", err);
          setConfig(null);
          setError(err.message || "Unable to load WhatsApp Business settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const postWhatsappBusinessAction = async (action, payload = {}) => {
    if (!vendorId || actionLoading) return;

    try {
      setActionLoading(action);
      setError("");
      setMessage("");

      const res = await fetch(`${API_BASE_URL}/api/vendor/whatsapp-business/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(vendorId),
        },
        body: JSON.stringify({ vendorId, ...payload }),
      });

      const json = await parseApiResponse(
        res,
        "Unable to update WhatsApp Business settings"
      );

      setConfig(json.data || null);
      setMessage(json.message || "WhatsApp Business settings updated");
      return json;
    } catch (err) {
      console.error("WhatsApp Business action failed", err);
      setError(err.message || "Unable to update WhatsApp Business settings");
      return null;
    } finally {
      setActionLoading("");
    }
  };

  const launchCentralMetaSignup = async () => {
    if (!vendorId || actionLoading) return;

    try {
      setActionLoading("connect");
      setError("");
      setMessage("");
      setConfig((prev) => ({
        ...(prev || {}),
        provider: "msg91",
        enabled: false,
        connectionStatus: "connecting",
      }));

      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}?viewMode=whatsapp-business-dashboard`
          : "";
      const prepareRes = await fetch(`${API_BASE_URL}/api/vendor/whatsapp-business/meta/connect-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(vendorId),
        },
        body: JSON.stringify({ vendorId, returnUrl }),
      });

      const json = await parseApiResponse(prepareRes, "Unable to start WhatsApp setup");
      const connectToken = json?.data?.connectToken;
      const connectBaseUrl = getWhatsappConnectBaseUrl();

      if (!connectToken || !connectBaseUrl) {
        throw new Error("WhatsApp setup link could not be created");
      }

      const connectUrl = new URL("/whatsapp-connect", connectBaseUrl);
      connectUrl.searchParams.set("connectToken", connectToken);

      if (typeof window !== "undefined") {
        window.location.assign(connectUrl.toString());
      }
    } catch (err) {
      console.error("WhatsApp Business setup launch failed", err);
      setError(
        "Your WhatsApp Business connection could not be completed. YNOT will continue sending bills from the YNOT WhatsApp number."
      );
      setConfig((prev) => ({
        ...(prev || {}),
        provider: "msg91",
        enabled: false,
        connectionStatus: "error",
      }));
    } finally {
      setActionLoading("");
    }
  };

  const handleDisconnect = () => {
    const shouldDisconnect = window.confirm(
      "Disconnect this WhatsApp Business setup and continue using YNOT's WhatsApp number?"
    );

    if (shouldDisconnect) {
      postWhatsappBusinessAction("disconnect");
    }
  };

  const status = config?.connectionStatus || "not_connected";
  const isConnected = CONNECTED_STATUSES.has(status);
  const statusTone = getStatusTone(status);
  const hasConnectLauncher = getHasWhatsappConnectLauncher();

  return (
    <section className="whatsapp-business-panel">
      <div className="whatsapp-business-hero">
        <div>
          <div className="whatsapp-business-eyebrow">WhatsApp Business</div>
          <h2 className="whatsapp-business-title">
            {isConnected ? "WhatsApp Business" : "Connect Your WhatsApp Business"}
          </h2>
          <p className="whatsapp-business-description">
            Send YNOT bills and customer messages from your own WhatsApp Business number.
          </p>
        </div>

        <div className={`whatsapp-business-status whatsapp-business-status-${statusTone}`}>
          {formatStatus(status)}
        </div>
      </div>

      {loading ? (
        <div className="whatsapp-business-state">Loading WhatsApp Business settings...</div>
      ) : (
        <>
          {error && <div className="whatsapp-business-alert error">{error}</div>}
          {message && <div className="whatsapp-business-alert success">{message}</div>}
          {!hasConnectLauncher && !isConnected && (
            <div className="whatsapp-business-alert warning">
              WhatsApp connection launcher is not configured. Add the central WhatsApp
              connect URL to enable the connection flow.
            </div>
          )}

          {isConnected ? (
            <div className="whatsapp-business-grid">
              <div className="whatsapp-business-card">
                <span>Business</span>
                <strong>{config?.displayName || "Not available yet"}</strong>
              </div>
              <div className="whatsapp-business-card">
                <span>Connected Number</span>
                <strong>{config?.displayPhoneNumber || "Not available yet"}</strong>
              </div>
              <div className="whatsapp-business-card">
                <span>Connection Status</span>
                <strong>{formatStatus(status)}</strong>
              </div>
              <div className="whatsapp-business-card">
                <span>Billing Template</span>
                <strong>
                  {config?.templateStatus === "not_configured"
                    ? "Not configured yet"
                    : config?.templateStatus || "Not configured yet"}
                </strong>
              </div>
            </div>
          ) : (
            <div className="whatsapp-business-empty-card">
              <h3>Use your own WhatsApp number</h3>
              <p>
                YNOT will continue sending billing messages through the approved MSG91 setup
                until your Meta WhatsApp Business connection is fully ready.
              </p>
            </div>
          )}

          <div className="whatsapp-business-actions">
            {isConnected ? (
              <>
	                <button
	                  type="button"
	                  className="whatsapp-business-button primary"
	                  disabled={Boolean(actionLoading)}
	                  onClick={() => setMessage("Template setup is coming next.")}
	                >
	                  Continue Setup
	                </button>
                <button
                  type="button"
                  className="whatsapp-business-button secondary"
                  disabled={Boolean(actionLoading)}
                  onClick={handleDisconnect}
                >
                  {actionLoading === "disconnect" ? "Disconnecting..." : "Disconnect"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="whatsapp-business-button primary"
                disabled={Boolean(actionLoading) || !hasConnectLauncher}
                onClick={launchCentralMetaSignup}
              >
                {actionLoading === "connect" ? "Connecting..." : "Connect WhatsApp"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
