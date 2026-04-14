import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

const fallbackCountries = [
  { name: "India", code: "91" },
];

function AddCustomerModal({ show, onClose, onAdded }) {
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState([]);
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);

 useEffect(() => {
  if (!show) return;
  if (countries.length > 0) {
    setCountriesLoading(false);
    if (!countryCode) {
      setCountryCode(countries[0]?.code || "91");
    }
    return;
  }

  let cancelled = false;

  const fetchCountries = async () => {
    try {
      setCountriesLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/countries/codes`
      );

      const data = res.data.data;

      if (!Array.isArray(data)) {
        throw new Error("Countries data is not an array");
      }

      const countryList = data
        .map((c) => ({
          name: c.name,
          code: c.dial_code.replace("+", ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const finalList = countryList.length > 0 ? countryList : fallbackCountries;

      if (cancelled) return;
      setCountries(finalList);
      setCountryCode((current) => current || finalList[0]?.code || "91");
    } catch (err) {
      console.error("Failed to fetch countries:", err);
      if (cancelled) return;
      setCountries(fallbackCountries);
      setCountryCode((current) => current || fallbackCountries[0].code);
    } finally {
      if (!cancelled) {
        setCountriesLoading(false);
      }
    }
  };

  fetchCountries();

  return () => {
    cancelled = true;
  };
}, [show, countries.length, countryCode]);


  useEffect(() => {
    if (!show) {
      setStep(1);
      setPhone("");
      setOtp("");
      setCountryCode(countries[0]?.code || "91");
      setCountriesLoading(countries.length === 0);
    }
  }, [show, countries]);

  if (!show) return null;

  const fullNumber = () => `${countryCode}${phone.replace(/\D/g, "")}`;

  const requestOtp = async () => {
    if (!countryCode || !phone || phone.replace(/\D/g, "").length < 6)
      return alert("Enter valid phone number");

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/api/customers/request-otp`, {
        countryCode,
        phone: phone.replace(/\D/g, ""),
      });

      setStep(2);
      alert("OTP sent (check mobile)");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/api/customers/verify-otp`, {
        countryCode,
        phone: phone.replace(/\D/g, ""),
        otp,
      });

      alert("Customer added");
      onAdded?.();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "OTP verify failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 10,
          width: 360,
        }}
      >
        {step === 1 && (
          <>
            <h3>Add Customer — Step 1</h3>

            {countriesLoading ? (
              <div>Loading country codes...</div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label>Country Code</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} (+{c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={onClose} style={{ flex: 1, padding: 10 }}>
                    Cancel
                  </button>
                  <button
                    onClick={requestOtp}
                    style={{
                      flex: 1,
                      padding: 10,
                      background: "#00AEEF",
                      color: "#fff",
                      border: "none",
                    }}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Next"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h3>Enter OTP — Step 2</h3>
            <p>We sent OTP to +{fullNumber()}</p>

            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              style={{ width: "100%", padding: 8, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: 10 }}
              >
                Back
              </button>
              <button
                onClick={verifyOtp}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#00AEEF",
                  color: "#fff",
                  border: "none",
                }}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify & Add"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddCustomerModal;
