"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../config";
import {
  extractEmbeddedSignupSessionInfo,
  hasCompleteEmbeddedSignupResult,
  parseMetaEmbeddedSignupMessage,
} from "../utils/whatsappEmbeddedSignup";
import "./whatsapp-connect.css";

const FACEBOOK_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";

function parseApiError(res, payload, fallback) {
  const message = payload?.message || fallback;
  console.error("WhatsApp Connect API error", {
    status: res.status,
    statusText: res.statusText,
    message,
    code: payload?.code,
  });
  return new Error(message);
}

async function readApiResponse(res, fallback) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.success) {
    throw parseApiError(res, payload, fallback);
  }
  return payload;
}

function loadFacebookSdk({ appId, graphApiVersion }) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Meta setup must run in the browser"));
      return;
    }

    if (window.FB) {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphApiVersion,
      });
      resolve(window.FB);
      return;
    }

    window.fbAsyncInit = function initFacebookSdk() {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphApiVersion,
      });
      resolve(window.FB);
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.FB) resolve(window.FB);
      }, { once: true });
      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Meta setup"));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = FACEBOOK_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Unable to load Meta setup"));
    document.body.appendChild(script);
  });
}

function getFrontendMetaConfig() {
  return {
    appId: process.env.NEXT_PUBLIC_META_APP_ID || "",
    embeddedSignupConfigId: process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID || "",
    graphApiVersion: process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION || "v26.0",
  };
}

function WhatsappConnectContent() {
  const searchParams = useSearchParams();
  const connectToken = searchParams.get("connectToken") || "";
  const completionStartedRef = useRef(false);
  const [status, setStatus] = useState("Preparing");
  const [error, setError] = useState("");
  const [metaConfig, setMetaConfig] = useState(null);
  const [returnUrl, setReturnUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      if (!connectToken) {
        setError("WhatsApp setup link is missing or expired. Please start again from your dashboard.");
        setStatus("Error");
        return;
      }

      try {
        setStatus("Preparing");
        const res = await fetch(
          `${API_BASE_URL}/api/vendor/whatsapp-business/meta/config?connectToken=${encodeURIComponent(connectToken)}`,
          { cache: "no-store" }
        );
        const payload = await readApiResponse(res, "Unable to load WhatsApp setup");
        const frontendConfig = getFrontendMetaConfig();
        const config = {
          appId: frontendConfig.appId || payload.data?.appId || "",
          embeddedSignupConfigId:
            frontendConfig.embeddedSignupConfigId ||
            payload.data?.embeddedSignupConfigId ||
            "",
          graphApiVersion:
            frontendConfig.graphApiVersion ||
            payload.data?.graphApiVersion ||
            "v26.0",
          isEmbeddedSignupConfigured:
            Boolean(frontendConfig.appId || payload.data?.appId) &&
            Boolean(frontendConfig.embeddedSignupConfigId || payload.data?.embeddedSignupConfigId),
        };

        if (!cancelled) {
          setMetaConfig(config);
          setReturnUrl(payload.data?.returnUrl || "");
          if (!config.isEmbeddedSignupConfigured) {
            setStatus("Error");
            setError("Meta Embedded Signup is not configured for this environment.");
          } else {
            setStatus("Ready");
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("WhatsApp setup config failed", err);
          setStatus("Error");
          setError("Unable to prepare WhatsApp setup. Please try again from your dashboard.");
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [connectToken]);

  useEffect(() => {
    const handleMessage = (event) => {
      const payload = parseMetaEmbeddedSignupMessage(event);
      if (!payload) return;

      console.info("Meta Embedded Signup session event", {
        event: payload.event,
        hasData: Boolean(payload.data),
      });

      if (payload.event === "FINISH") {
        setSessionInfo(extractEmbeddedSignupSessionInfo(payload));
      }

      if (payload.event === "CANCEL" || payload.event === "ERROR") {
        setStatus("Error");
        setError("WhatsApp Business setup was not completed. Please try again when you are ready.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    async function completeConnection() {
      if (completionStartedRef.current) return;
      if (!hasCompleteEmbeddedSignupResult({ code: authCode, sessionInfo })) return;

      try {
        completionStartedRef.current = true;
        setStatus("Verifying");
        setError("");

        const res = await fetch(`${API_BASE_URL}/api/vendor/whatsapp-business/meta/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectToken,
            code: authCode,
            wabaId: sessionInfo.wabaId,
            phoneNumberId: sessionInfo.phoneNumberId,
            signupData: sessionInfo,
          }),
        });

        const payload = await readApiResponse(
          res,
          "Unable to complete WhatsApp Business connection"
        );

        setStatus("Connected");
        const destination = payload.returnUrl || returnUrl || "/";
        window.setTimeout(() => {
          window.location.assign(destination);
        }, 1400);
      } catch (err) {
        console.error("WhatsApp setup completion failed", err);
        setStatus("Error");
        setError(
          "Your WhatsApp Business connection could not be completed. YNOT will continue sending bills from the YNOT WhatsApp number."
        );
      }
    }

    completeConnection();
  }, [authCode, connectToken, returnUrl, sessionInfo]);

  const startMetaSignup = async () => {
    if (!metaConfig?.isEmbeddedSignupConfigured) {
      setError("Meta Embedded Signup is not configured for this environment.");
      setStatus("Error");
      return;
    }

    try {
      setStatus("Connecting");
      setError("");
      const fb = await loadFacebookSdk({
        appId: metaConfig.appId,
        graphApiVersion: metaConfig.graphApiVersion,
      });

      fb.login(
        (response) => {
          const code = response?.authResponse?.code || "";
          if (!code) {
            setStatus("Error");
            setError("WhatsApp Business setup was cancelled. Please try again when you are ready.");
            return;
          }

          setAuthCode(code);
        },
        {
          config_id: metaConfig.embeddedSignupConfigId,
          response_type: "code",
          override_default_response_type: true,
          extras: { version: "v4" },
        }
      );
    } catch (err) {
      console.error("Meta SDK launch failed", err);
      setStatus("Error");
      setError("Unable to open Meta WhatsApp setup. Please try again.");
    }
  };

  return (
    <main className="whatsapp-connect-page">
      <section className="whatsapp-connect-card">
        <div className="whatsapp-connect-mark">Y</div>
        <p className="whatsapp-connect-kicker">YNOT WhatsApp Business</p>
        <h1>Connect Your WhatsApp Business</h1>
        <p className="whatsapp-connect-copy">
          Connect the WhatsApp Business number you want YNOT to use for bills and customer messages.
          Your number will be verified and connected securely through Meta.
        </p>

        <div className={`whatsapp-connect-status ${status.toLowerCase()}`}>
          {status}
        </div>

        {error && <div className="whatsapp-connect-error">{error}</div>}

        <button
          type="button"
          className="whatsapp-connect-button"
          disabled={status === "Connecting" || status === "Verifying" || status === "Connected"}
          onClick={startMetaSignup}
        >
          {status === "Connecting" || status === "Verifying"
            ? "Working..."
            : "Connect with WhatsApp"}
        </button>

        <p className="whatsapp-connect-footnote">
          YNOT will continue using the current WhatsApp billing setup until your Meta connection
          and templates are fully ready.
        </p>
      </section>
    </main>
  );
}

export default function WhatsappConnectPage() {
  return (
    <Suspense fallback={<main className="whatsapp-connect-page">Preparing...</main>}>
      <WhatsappConnectContent />
    </Suspense>
  );
}
