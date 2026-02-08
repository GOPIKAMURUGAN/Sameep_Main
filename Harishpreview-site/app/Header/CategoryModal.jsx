"use client";
import { useEffect, useState } from "react";
import "./CategoryModal.css";
import { FcGoogle } from "react-icons/fc";
import { useCategoryTree } from "./CategoryModal2";
import './CategoryModal2.css';
const CATEGORY_API =
  "https://newsameep-backend.go-kar.net/api/dummy-categories";


  const getSelectedLeafIds = (nodes, selectedIds) => {
  return selectedIds.filter((id) => {
    const node = nodes[id];
    return node && node.children.length === 0;
  });
};


export default function ChooseCategoryModal({ onClose }) {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("CATEGORY");
  const [loading, setLoading] = useState(true);

  const [elapsed, setElapsed] = useState(0);
const [vendorId, setVendorId] = useState(null);

  const [businessQuery, setBusinessQuery] = useState("");
  const [googleResults, setGoogleResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [activePlaceId, setActivePlaceId] = useState(null);
const [confirmedCategory, setConfirmedCategory] = useState(null);


  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState(["", "", "", ""]);
  const [captchaError, setCaptchaError] = useState("");


function getAllLeafNodes(nodes) {
  const leafIds = [];

  for (const id in nodes) {
    const node = nodes[id];

    if (
      Array.isArray(node.children) &&
      node.children.length === 0
    ) {
      leafIds.push(id);
    }
  }

  return leafIds;
}



  const rating = selectedBusiness?.rating;
  const totalReviews = selectedBusiness?.userRatingsTotal;
  const latitude = selectedBusiness?.location?.lat;
  const longitude = selectedBusiness?.location?.lng;

  const [selectedSearchBusiness, setSelectedSearchBusiness] = useState(null);

const {
  nodes,
  rootIds,
  toggleNode,
  toggleSelect,
  selectedIds,
} = useCategoryTree({
  setupSelectedCategory: confirmedCategory,
  overrideCatId: null,
});

const countSelectedChildren = (id, nodes, selectedIds) => {
  const node = nodes[id];
  if (!node || !node.children) return 0;

  let count = 0;

  for (const childId of node.children) {
    if (selectedIds.includes(childId)) {
      count++;
    }
    count += countSelectedChildren(childId, nodes, selectedIds);
  }

  return count;
};



function CategoryNode({
  id,
  nodes,
  toggleNode,
  toggleSelect,
  selectedIds,
}) {
  const node = nodes[id];
  if (!node) return null;

  const isChecked = selectedIds.includes(id);
  const isLeaf = node.children.length === 0;
  const directChildCount = node.children.length;

  return (
    <div className="service-node">
      <div className={`service-card ${isChecked ? "active" : ""}`}>
        <label className="service-left">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleSelect(id)}
          />
          <span className="check-ui" />

          <span className="service-name">
            {node.data.name}

            {/* ✅ DIRECT CHILD COUNT */}
            {!isLeaf && (
              <span className="child-count-badge">
                {directChildCount}
              </span>
            )}
          </span>
        </label>

        {/* ✅ EXPAND ARROW ONLY IF CHILD EXISTS */}
        {!isLeaf && (
          <button
            type="button"
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(id);
            }}
          >
            {node.expanded ? "▾" : "▸"}
          </button>
        )}
      </div>

      {node.expanded && directChildCount > 0 && (
        <div className="service-children">
          {node.children.map((childId) => (
            <CategoryNode
              key={childId}
              id={childId}
              nodes={nodes}
              toggleNode={toggleNode}
              toggleSelect={toggleSelect}
              selectedIds={selectedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}




  const normalizePhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "").replace(/^91/, "");
  };
  const openingHoursText = Array.isArray(selectedBusiness?.openingHoursText)
    ? selectedBusiness.openingHoursText
    : [];

  const handleContinueWithoutOtp = async () => {
    if (!selected?._id || !selectedBusiness?.name) {
      alert("Missing required data");
      return;
    }

    const cleanPhone = normalizePhone(phoneNumber || "9999999999");

    try {
      /* ================= 1️⃣ BYPASS OTP ================= */
      const bypassPayload = {
        countryCode: "91",
        phone: cleanPhone,
      };

      const bypassRes = await fetch(
        "https://newsameep-backend.go-kar.net/api/customers/bypass-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bypassPayload),
        }
      );

      const bypassJson = await bypassRes.json(); // ✅ FIRST parse response

      if (!bypassRes.ok) {
        alert(bypassJson.message || "OTP bypass failed");
        return;
      }

      // ✅ NOW extract customerId
      const customerId =
        bypassJson?.customer?._id ||
        bypassJson?.customer?.id ||
        "";

      if (!customerId) {
        alert("Customer ID not received from backend");
        return;
      }


      /* ================= 2️⃣ REGISTER VENDOR ================= */
      const vendorPayload = {
        customerId: customerId,
        phone: cleanPhone,
        businessName: selectedBusiness.name,
        contactName: selectedBusiness.name,
        categoryId: selected._id,
        status: "Registered",
        location: {
          lat: latitude,
          lng: longitude,
          address: selectedBusiness.address
        },
        openingHoursText,
      };

      const vendorRes = await fetch(
        "https://newsameep-backend.go-kar.net/api/dummy-vendors",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vendorPayload),
        }
      );

     const vendorData = await vendorRes.json();
if (!vendorRes.ok) {
  alert(vendorData.message || "Vendor registration failed");
  return;
}

// ✅ SAVE VENDOR ID
setVendorId(vendorData.vendor?._id || vendorData._id);

setStep("SUCCESS");


    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };



  /* ================= TIMER ================= */
  useEffect(() => {
    const i = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  /* ================= LOAD CATEGORIES ================= */
  useEffect(() => {
    fetch(CATEGORY_API)
      .then((r) => r.json())
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= STEP PROGRESS ================= */
  const stepPercent = {
    CATEGORY: 14,
    CONNECT: 28,
    GOOGLE_SEARCH: 42,
    GOOGLE_RESULTS: 56,
    VERIFY_PHONE: 70,
    SUCCESS: 85,
    SERVICES_SELECT: 100,
  }[step];


  /* ================= CAPTCHA ================= */
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptcha(code);
    setCaptchaInput(["", "", "", ""]); // ✅ reset properly
    setCaptchaError("");
  };
  const handleCaptchaChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return; // only numbers

    const next = [...captchaInput];
    next[index] = value;
    setCaptchaInput(next);

    // move to next box
    if (value && index < 3) {
      document.getElementById(`captcha-${index + 1}`)?.focus();
    }
  };

  const handleCaptchaKeyDown = (e, index) => {
    if (e.key === "Backspace" && !captchaInput[index] && index > 0) {
      document.getElementById(`captcha-${index - 1}`)?.focus();
    }
  };


  useEffect(() => {
    if (step === "GOOGLE_SEARCH") generateCaptcha();
  }, [step]);

  /* ================= GOOGLE SEARCH ================= */
  const handleGoogleSearch = async () => {
    if (businessQuery.trim().length < 3) {
      setCaptchaError("Enter at least 3 characters");
      return;
    }

    // ✅ FIXED CAPTCHA CHECK
    if (captchaInput.join("") !== captcha) {
      setCaptchaError("Captcha does not match");
      return;
    }

    try {
      const res = await fetch(
        `https://newsameep-backend.go-kar.net/api/google/places/search?query=${encodeURIComponent(
          businessQuery
        )}`
      );

      const data = await res.json();
      setGoogleResults(data.results || []);
      setStep("GOOGLE_RESULTS");
    } catch (err) {
      setCaptchaError("Search failed. Try again.");
    }
  };


  /* ================= SELECT BUSINESS ================= */
  const handleSelectBusiness = (biz) => {
    setSelectedSearchBusiness(biz);   // ⭐ contains rating & reviews
    setActivePlaceId(biz.placeId);
  };


  /* ================= FETCH DETAILS ================= */
  const fetchBusinessDetails = async () => {
    const res = await fetch(
      `https://newsameep-backend.go-kar.net/api/google/places/details?placeId=${activePlaceId}`
    );

    const data = await res.json();

    setSelectedBusiness({
      ...selectedSearchBusiness, // ✅ keeps address, rating, location
      ...data.place,             // adds phone, extra info
      address: selectedSearchBusiness?.address, // 🔥 FORCE KEEP ADDRESS
    });

    setStep("VERIFY_PHONE");
  };


  /* ================= BACK ================= */
const handleBack = () => {
  if (step === "SERVICES_SELECT") setStep("SUCCESS");
  else if (step === "SUCCESS") setStep("VERIFY_PHONE");
  else if (step === "VERIFY_PHONE") setStep("GOOGLE_RESULTS");
  else if (step === "GOOGLE_RESULTS") setStep("GOOGLE_SEARCH");
  else if (step === "GOOGLE_SEARCH") setStep("CONNECT");
  else if (step === "CONNECT") {
    setConfirmedCategory(null); 
    setStep("CATEGORY");
  }
  else onClose();
};



  const phoneNumber =
    selectedBusiness?.internationalPhoneNumber ||
    selectedBusiness?.phone ||
    "";

  return (
    <div className="modal-overlay">
      <div className="category-modal">

        {/* HEADER */}
        <div className="modal-header">
          <div className="header-left">
            <div className="timer-box">{minutes}:{seconds}</div>
            <button className="back-btn" onClick={handleBack}>←</button>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* STEP INDICATOR */}
        <div className="step-indicator-wrapper">
          <div className="step-line-bg">
            <div
              className="step-line-fill"
              style={{ width: `${stepPercent}%` }}
            />
          </div>

          <div className="step-dots">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className={`step-dot ${stepPercent >= n * (100 / 7) ? "active" : ""}`}
              >
                {n}
              </div>
            ))}
          </div>

        </div>

        {/* ================= CATEGORY ================= */}
        {step === "CATEGORY" && (
          <>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category..."
            />

            <div className="category-grid">
              {!loading &&
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id || cat._id}
                    className={`category-card ${selected?.name === cat.name ? "active" : ""
                      }`}
                    onClick={() => setSelected(cat)}
                  >
                    <img src={cat.imageUrl} />
                    <span>{cat.name}</span>
                  </div>
                ))}
            </div>

            <button
  className="next-btn"
  disabled={!selected}
  onClick={() => {
    setConfirmedCategory(selected); // ✅ trigger tree build
    setStep("CONNECT");
  }}
>
  Next
</button>

          </>
        )}

        {/* ================= CONNECT ================= */}
        {step === "CONNECT" && selected && (
          <div className="connect-section">
            <div className="selected-category-card">
              <img src={selected.imageUrl} />
              <p>{selected.name}</p>
            </div>

            <button className="google-btn google-connect-btn" onClick={() => setStep("GOOGLE_SEARCH")}>
              <FcGoogle size={27} />
              <span>Connect your Google Business</span>
            </button>


            <button className="phone-btn" onClick={() => setStep("VERIFY_PHONE")}>
              Continue with Mobile Number
            </button>
          </div>
        )}

        {/* ================= GOOGLE SEARCH ================= */}
        {step === "GOOGLE_SEARCH" && (
          <div className="google-search-section">

            {/* BUSINESS INPUT */}
            <input
              className="google-input"
              value={businessQuery}
              onChange={(e) => setBusinessQuery(e.target.value)}
              placeholder="Enter your bussiness name"
            />

            <p className="captcha-helper-text">
              Enter the captcha to continue
            </p>

            {/* CAPTCHA DISPLAY */}
            <div className="captcha-mini-box">
              <span className="captcha-mini-code">{captcha}</span>
              <button type="button" onClick={generateCaptcha}>↻</button>
            </div>

            {/* CAPTCHA INPUT – 4 SEPARATE BOXES */}
            <div className="captcha-input-row">
              {captchaInput.map((digit, i) => (
                <input
                  key={i}
                  id={`captcha-${i}`}
                  className="captcha-digit"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCaptchaChange(e.target.value, i)}
                  onKeyDown={(e) => handleCaptchaKeyDown(e, i)}
                />
              ))}
            </div>

            {captchaError && <p className="captcha-error">{captchaError}</p>}

            {/* SEARCH BUTTON */}
            <button
              className="google-search-btn"
              disabled={
                businessQuery.trim().length < 3 ||
                captchaInput.some((d) => d === "")
              }
              onClick={handleGoogleSearch}
            >
              Search
            </button>

          </div>
        )}


        {/* ================= GOOGLE RESULTS ================= */}
        {step === "GOOGLE_RESULTS" && (
          <div className="google-results-section">

            <p className="results-title">Select your business</p>

            {/* SCROLLABLE RESULTS */}
            <div className="google-results-scroll">
              {googleResults.map((biz) => (
                <div
                  key={biz.placeId}
                  className={`google-result-card ${activePlaceId === biz.placeId ? "active" : ""
                    }`}
                  onClick={() => handleSelectBusiness(biz)}
                >
                  <p className="google-result-name">{biz.name}</p>
                  <p className="google-result-address">{biz.address}</p>
                </div>
              ))}
            </div>

            {/* NEXT BUTTON */}
            <button
              className="next-btn"
              disabled={!activePlaceId}
              onClick={fetchBusinessDetails}
            >
              Next
            </button>

          </div>
        )}

        {/* ================= VERIFY PHONE ================= */}
        {step === "VERIFY_PHONE" && selectedBusiness && (
          <div className="verify-phone-section">

            {/* BUSINESS NAME */}
            <p><b>{selectedBusiness.name}</b></p>

            {/* ADDRESS */}
            <p>{selectedBusiness.address}</p>

            {/* ⭐ RATING */}
            {rating !== undefined && (
              <p>
                <b>Rating:</b> ⭐ {rating}
                {totalReviews !== undefined && ` (${totalReviews} reviews)`}
              </p>
            )}

            {/* 📍 LAT / LNG */}
            {latitude && longitude && (
              <p>
                <b>Latitude:</b> {latitude}<br />
                <b>Longitude:</b> {longitude}
              </p>
            )}

            {/* 📞 PHONE (if exists later) */}
            <p>
              <b>Phone:</b> {phoneNumber || "Not available"}
            </p>

            <button className="otp-btn" disabled={!phoneNumber}>
              Send OTP
            </button>

            <button className="bypass-btn" onClick={handleContinueWithoutOtp}>
              Continue without OTP
            </button>


          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "SUCCESS" && (
          <div className="success-card">

            <h2>Your profile has been registered</h2>
            <p>Continue to select your services.</p>

            <div className="success-actions">
              <button
                className="success-cancel"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                className="success-next"
                onClick={() => setStep("SERVICES_SELECT")}
              >
                Next
              </button>

            </div>

          </div>
        )}

        {/* ================= SERVICES SELECT ================= */}


        {step === "SERVICES_SELECT" && (
  <div className="services-select-card">

    <h2 className="services-title">Select Services</h2>

    {/* SCROLLABLE TREE */}
    <div className="services-scroll">
      {rootIds.map((id) => (
        <CategoryNode
          key={id}
          id={id}
          nodes={nodes}
          toggleNode={toggleNode}
          toggleSelect={toggleSelect}
          selectedIds={selectedIds}
        />
      ))}
    </div>

    {/* STICKY FOOTER */}
    <div className="services-footer">
      <button
        className="btn secondary"
        onClick={() => setStep("SUCCESS")}
      >
        Back
      </button>

      <button
  className="btn primary"
  disabled={selectedIds.length === 0}
 onClick={async () => {
  try {
    const leafIds = getSelectedLeafIds(nodes, selectedIds);

    const payload = {
      vendorId,
      rootCategoryId:
        confirmedCategory?._id || confirmedCategory?.id,
      activeLeafCategoryIds: leafIds,
    };

    console.log("🔴 SYNC PAYLOAD:", payload);

    const res = await fetch(
      "http://localhost:5001/api/vendor-price-nodes/sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text(); // 👈 important
    console.log("🔴 STATUS:", res.status);
    console.log("🔴 RESPONSE:", text);

    if (!res.ok) {
      alert("Sync failed: " + text);
      return;
    }

    alert("Sync success");
    onClose();

  } catch (err) {
    console.error("NETWORK ERROR:", err);
    alert("Network error");
  }
}}

>
  Next
</button>

    </div>

  </div>
)}
      </div>
    </div>
  );
}