"use client";
import { useState } from "react";
import "./Login.css";

export default function Login({ onClose }) {
    console.log("LOGIN MODAL RENDERED");

  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [adminMode, setAdminMode] = useState(false);
  const [adminPass, setAdminPass] = useState("");

  // -----------------------------
  // SEND OTP
  // -----------------------------
  const sendOtp = async () => {
    if (mobile.length !== 10) {
      alert("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      const res = await fetch(
        `api/${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: countryCode,
            phone: mobile,
          }),
        }
      );

      const data = await res.json();
      console.log("OTP RESPONSE:", data);

      if (data.message === "OTP sent") {
        setOtpSent(true);
      } else {
        alert(data.message || "OTP sending failed");
      }
    } catch (err) {
      alert("Network Error");
    }
  };

  // -----------------------------
  // VERIFY OTP
  // -----------------------------
 const verifyOtp = async () => {
    console.log("CLOSING MODAL FROM CHILD");
console.log("onClose exists:", typeof onClose);

  if (!otp) {
    alert("Enter OTP");
    return;
  }

  try {
    const res = await fetch(
      `api/${process.env.NEXT_PUBLIC_API_BASE_URL}/api/customers/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode,
          phone: mobile,
          otp,
        }),
      }
    );

    const data = await res.json();
    console.log("VERIFY RESPONSE:", data);

    if (data.message === "OTP verified") {
      localStorage.setItem(
        "userData",
        JSON.stringify({
          name: data.customer.firstName + " " + data.customer.lastName,
          phone: data.customer.phNo,
        })
      );

      alert("Login Successful!");
      console.log("Closing modal...");

      if (typeof onClose === "function") {
        onClose();
      }

      setTimeout(() => {
        window.dispatchEvent(new Event("storage"));
      }, 50);

    } else {
      alert(data.message || "Invalid OTP");
    }
  } catch (err) {
    alert("Network Error");
  }
};


  // -----------------------------
  // VERIFY ADMIN PASSCODE
  // -----------------------------
  const verifyAdmin = () => {
  if (adminPass === "1234") {

    // Save admin user into localStorage
    localStorage.setItem(
      "userData",
      JSON.stringify({
        name: "Admin User",
        phone: "N/A",
        isAdmin: true
      })
    );

    // Update Header immediately
    window.dispatchEvent(new Event("storage"));

    // Close login modal
    onClose();

  } else {
    alert("Incorrect Admin Passcode");
  }
};

  return (
    <div className="login-overlay">
      <div className="login-modal">
        {/* =====================================================
            SCREEN 1 → LOGIN WITH MOBILE
        ====================================================== */}
        {!otpSent && !adminMode && (
          <>
            <h4 className="login-sub">Log in</h4>
            <h2 className="login-title">Welcome to Harish</h2>
            <p className="login-desc">Explore our services with a quick login.</p>

            <label className="login-label">Mobile number</label>

            <div className="mobile-input">
              <select
                className="country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                <option value="+91">🇮🇳 +91 India</option>
                <option value="+1">🇺🇸 +1 USA</option>
                <option value="+44">🇬🇧 +44 UK</option>
                <option value="+61">🇦🇺 +61 Australia</option>
                <option value="+971">🇦🇪 +971 UAE</option>
                <option value="+974">🇶🇦 +974 Qatar</option>
                <option value="+966">🇸🇦 +966 Saudi Arabia</option>
                <option value="+92">🇵🇰 +92 Pakistan</option>
                <option value="+880">🇧🇩 +880 Bangladesh</option>
                <option value="+94">🇱🇰 +94 Sri Lanka</option>
                <option value="+81">🇯🇵 +81 Japan</option>
                <option value="+82">🇰🇷 +82 South Korea</option>
                <option value="+86">🇨🇳 +86 China</option>
                <option value="+49">🇩🇪 +49 Germany</option>
                <option value="+33">🇫🇷 +33 France</option>
                <option value="+39">🇮🇹 +39 Italy</option>
                <option value="+34">🇪🇸 +34 Spain</option>
              </select>

              <input
                type="tel"
                maxLength={10}
                placeholder="Mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <button className="continue-btn" onClick={sendOtp}>
              Continue
            </button>

            <button className="admin-btn" onClick={() => setAdminMode(true)}>
              Login as Admin
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button className="google-btn">Continue with Google</button>

            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {/* =====================================================
            SCREEN 2 → OTP VERIFY
        ====================================================== */}
        {otpSent && !adminMode && (
          <>
            <h4 className="login-sub">Verify OTP</h4>

            <p className="otp-message">
              We sent a one-time password to
              <span className="otp-number"> {countryCode}{mobile}</span>
            </p>

            <div className="otp-box">
              <input
                className="otp-input"
                type="number"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button className="continue-btn" onClick={verifyOtp}>
              Verify & Continue
            </button>

            <button className="cancel-btn" onClick={() => setOtpSent(false)}>
              Back
            </button>
          </>
        )}

        {/* =====================================================
            SCREEN 3 → ADMIN LOGIN
        ====================================================== */}
        {adminMode && (
          <>
            <h4 className="login-sub">Admin Login</h4>
            <p className="login-desc">Enter the admin passcode to continue.</p>

            <input
              className="otp-input"
              type="password"
              placeholder="Enter Admin Passcode"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
            />

            <button className="continue-btn" onClick={verifyAdmin}>
              Login as Admin
            </button>

            <button className="cancel-btn" onClick={() => setAdminMode(false)}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
