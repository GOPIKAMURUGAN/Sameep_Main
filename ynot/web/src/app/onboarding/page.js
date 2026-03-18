"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ServiceAreasStep from "../../components/onboarding/ServiceAreasStep";
import {
  adminImpersonate,
  bypassOtp,
  createVendor,
  fetchDummyCategories,
  fetchTrustQuestions,
  getGooglePlaceDetails,
  getSubdomainSuggestions,
  requestOtp,
  saveServiceAreas,
  saveTrustAnswers,
  searchGooglePlaces,
  setVendorSubdomain,
  syncVendorPriceNodes,
  updateVendorStatus,
  verifyOtp,
} from "../../services/onboardingApi";
import { PREVIEW_BASE_URL } from "../../utils/config";
import { getSelectedLeafIds, useCategoryTree } from "../../utils/categoryTree";

const STEP_PROGRESS = {
  CATEGORY: 8,
  CONNECT: 16,
  GOOGLE_SEARCH: 26,
  GOOGLE_RESULTS: 36,
  VERIFY_PHONE_FORM: 46,
  VERIFY_PHONE: 56,
  VERIFY_OTP: 64,
  SUCCESS: 72,
  TRUST: 80,
  SERVICE_AREAS: 88,
  SERVICES_SELECT: 94,
  CHOOSE_DOMAIN: 97,
  PREVIEW_CHOICE: 100,
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="onboarding-shell"><section className="flow-card"><p className="muted-copy">Loading onboarding...</p></section></main>}>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId");

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmedCategory, setConfirmedCategory] = useState(null);
  const [step, setStep] = useState("CATEGORY");

  const [elapsed, setElapsed] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [businessQuery, setBusinessQuery] = useState("");
  const [googleResults, setGoogleResults] = useState([]);
  const [selectedSearchBusiness, setSelectedSearchBusiness] = useState(null);
  const [activePlaceId, setActivePlaceId] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState(["", "", "", ""]);
  const [captchaError, setCaptchaError] = useState("");

  const [manualBusinessName, setManualBusinessName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [countryCode, setCountryCode] = useState("91");

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [bypassOtpEnabled, setBypassOtpEnabled] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  const [vendorId, setVendorId] = useState(null);
  const [trustQuestions, setTrustQuestions] = useState([]);
  const [trustAnswers, setTrustAnswers] = useState({});
  const [serviceAreas, setServiceAreas] = useState(null);

  const [subdomainSuggestions, setSubdomainSuggestions] = useState([]);
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);
  const [syncing, setSyncing] = useState(false);

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

  useEffect(() => {
    const intervalId = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchDummyCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load onboarding categories", error);
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (!initialCategoryId || categories.length === 0 || confirmedCategory) return;

    const matched = categories.find((category) => {
      const id = category._id || category.id || category.categoryId;
      return id === initialCategoryId;
    });

    if (matched) {
      setSelected(matched);
      setConfirmedCategory(matched);
      setStep("CONNECT");
    }
  }, [categories, initialCategoryId, confirmedCategory]);

  useEffect(() => {
    if (step !== "TRUST" || !confirmedCategory?.name) return;

    fetchTrustQuestions(confirmedCategory.name)
      .then((data) => setTrustQuestions(data.questions || []))
      .catch((error) => {
        console.error("Failed to fetch trust questions", error);
        setTrustQuestions([]);
      });
  }, [step, confirmedCategory]);

  useEffect(() => {
    if (step !== "GOOGLE_SEARCH") return;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptcha(code);
    setCaptchaInput(["", "", "", ""]);
    setCaptchaError("");
  }, [step]);

  const filteredCategories = categories.filter((category) =>
    category.name?.toLowerCase().includes(search.toLowerCase())
  );

  const phoneNumber =
    selectedBusiness?.internationalPhoneNumber || selectedBusiness?.phone || "";

  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  function handleClose() {
    router.push("/");
  }

  function handleBack() {
    if (step === "PREVIEW_CHOICE") setStep("CHOOSE_DOMAIN");
    else if (step === "CHOOSE_DOMAIN") setStep("SERVICES_SELECT");
    else if (step === "SERVICES_SELECT") setStep("SERVICE_AREAS");
    else if (step === "SERVICE_AREAS") setStep("TRUST");
    else if (step === "TRUST") setStep("SUCCESS");
    else if (step === "SUCCESS") setStep("VERIFY_PHONE");
    else if (step === "VERIFY_OTP") {
      setOtpSent(false);
      setOtp("");
      setStep("VERIFY_PHONE");
    } else if (step === "VERIFY_PHONE") {
      setStep(selectedSearchBusiness ? "GOOGLE_RESULTS" : "VERIFY_PHONE_FORM");
    } else if (step === "VERIFY_PHONE_FORM") {
      setStep("CONNECT");
    } else if (step === "GOOGLE_RESULTS") {
      setStep("GOOGLE_SEARCH");
    } else if (step === "GOOGLE_SEARCH") {
      setStep("CONNECT");
    } else if (step === "CONNECT") {
      setConfirmedCategory(null);
      setSelected(null);
      setStep("CATEGORY");
    } else {
      handleClose();
    }
  }

  async function handleGoogleSearch() {
    if (businessQuery.trim().length < 3) {
      setCaptchaError("Enter at least 3 characters");
      return;
    }

    if (captchaInput.join("") !== captcha) {
      setCaptchaError("Captcha does not match");
      return;
    }

    try {
      setGlobalLoading(true);
      const data = await searchGooglePlaces(businessQuery);
      setGoogleResults(data.results || []);
      setStep("GOOGLE_RESULTS");
    } catch (error) {
      console.error(error);
      setCaptchaError("Search failed. Try again.");
    } finally {
      setGlobalLoading(false);
    }
  }

  async function fetchBusinessDetails() {
    try {
      setGlobalLoading(true);
      const data = await getGooglePlaceDetails(activePlaceId);

      setSelectedBusiness({
        placeId: selectedSearchBusiness?.placeId,
        name: selectedSearchBusiness?.name,
        address: selectedSearchBusiness?.address,
        location: selectedSearchBusiness?.location,
        rating: data.place?.rating ?? selectedSearchBusiness?.rating ?? null,
        userRatingsTotal:
          data.place?.userRatingsTotal ??
          selectedSearchBusiness?.userRatingsTotal ??
          0,
        types: Array.isArray(data.place?.types)
          ? data.place.types
          : selectedSearchBusiness?.types || [],
        openingHoursText:
          data.place?.openingHoursText ||
          selectedSearchBusiness?.openingHoursText ||
          [],
        internationalPhoneNumber: normalizePhone(
          data.place?.internationalPhoneNumber || ""
        ),
      });

      setStep("VERIFY_PHONE");
    } catch (error) {
      console.error(error);
      alert("Failed to fetch business details");
    } finally {
      setGlobalLoading(false);
    }
  }

  async function sendOtp(phoneOverride = "") {
    const rawMobile =
      phoneOverride ||
      selectedBusiness?.internationalPhoneNumber ||
      selectedBusiness?.phone ||
      manualPhone ||
      mobile;

    const normalizedMobile = normalizePhone(rawMobile);

    if (!normalizedMobile || normalizedMobile.length !== 10) {
      alert("Enter a valid mobile number");
      return;
    }

    try {
      setLoadingOtp(true);
      setMobile(normalizedMobile);
      await requestOtp({
        countryCode,
        phone: normalizedMobile,
      });
      setOtpSent(true);
      setStep("VERIFY_OTP");
    } catch (error) {
      console.error(error);
      alert(error.message || "OTP request failed");
    } finally {
      setLoadingOtp(false);
    }
  }

  async function registerVendorAfterOtp() {
    if (!selectedBusiness?.name || !confirmedCategory) {
      alert("Missing required vendor information");
      return;
    }

    const cleanPhone = normalizePhone(phoneNumber || manualPhone || "9999999999");

    try {
      const bypassData = await bypassOtp({
        countryCode,
        phone: cleanPhone,
      });

      const customerId =
        bypassData?.customer?._id || bypassData?.customer?.id || "";

      if (!customerId) {
        alert("Customer ID not received from backend");
        return;
      }

      const vendorPayload = {
        customerId,
        phone: cleanPhone,
        businessName: selectedBusiness?.name || manualBusinessName || "",
        contactName: selectedBusiness?.name || manualBusinessName || "",
        categoryId:
          confirmedCategory?._id ||
          confirmedCategory?.id ||
          confirmedCategory?.categoryId,
        status: "Registered",
        location: {
          lat: selectedBusiness?.location?.lat ?? null,
          lng: selectedBusiness?.location?.lng ?? null,
          address: selectedBusiness?.address || "",
        },
        openingHoursText: Array.isArray(selectedBusiness?.openingHoursText)
          ? selectedBusiness.openingHoursText
          : [],
        googlePlaceDetails: {
          placeId: selectedBusiness?.placeId || selectedSearchBusiness?.placeId || "",
          rating:
            selectedBusiness?.rating ?? selectedSearchBusiness?.rating ?? null,
          userRatingsTotal:
            selectedBusiness?.userRatingsTotal ??
            selectedSearchBusiness?.userRatingsTotal ??
            0,
          mapsUrl:
            selectedBusiness?.placeId
              ? `https://www.google.com/maps/place/?q=place_id:${selectedBusiness.placeId}`
              : selectedSearchBusiness?.placeId
                ? `https://www.google.com/maps/place/?q=place_id:${selectedSearchBusiness.placeId}`
                : "",
          types: Array.isArray(selectedBusiness?.types)
            ? selectedBusiness.types
            : selectedSearchBusiness?.types || [],
        },
      };

      const vendorData = await createVendor(vendorPayload);
      setVendorId(vendorData.vendor?._id || vendorData._id);
      setStep("SUCCESS");
    } catch (error) {
      console.error(error);
      alert(error.message || "Vendor registration failed");
    }
  }

  async function handleVerifyOtp() {
    const normalizedPhone = normalizePhone(mobile);

    if (!otp || otp.length < 4) {
      alert("Enter a valid OTP");
      return;
    }

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      alert("Please enter a valid 10 digit phone number");
      return;
    }

    try {
      setLoadingOtp(true);
      const data = await verifyOtp({
        countryCode,
        phone: normalizedPhone,
        otp,
      });

      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }

      setOtpSent(false);
      await registerVendorAfterOtp();
    } catch (error) {
      console.error(error);
      alert(error.message || "OTP verification failed");
    } finally {
      setLoadingOtp(false);
    }
  }

  async function handleVerifyAdminPasscode() {
    if (!adminPasscode) {
      alert("Enter admin passcode");
      return;
    }

    try {
      setVerifyingPasscode(true);
      await adminImpersonate({
        categoryId:
          confirmedCategory?._id ||
          confirmedCategory?.id ||
          confirmedCategory?.categoryId,
        passcode: adminPasscode,
        ...(vendorId ? { vendorId } : {}),
      });

      setBypassOtpEnabled(true);
      setShowAdminPopup(false);
      setAdminPasscode("");
      await registerVendorAfterOtp();
    } catch (error) {
      console.error(error);
      alert(error.message || "Invalid passcode");
    } finally {
      setVerifyingPasscode(false);
    }
  }

  async function handleTrustContinue() {
    try {
      setGlobalLoading(true);
      await saveTrustAnswers({
        vendorId,
        category: confirmedCategory?.name,
        answers: trustAnswers,
      });
      setStep("SERVICE_AREAS");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save trust info");
    } finally {
      setGlobalLoading(false);
    }
  }

  async function handleServiceAreasNext(data) {
    try {
      await saveServiceAreas({
        vendorId,
        primaryLocality: data.primaryLocality,
        city: data.city,
        targetAreas: data.targetAreas,
        autoSuggested: data.autoSuggested ?? true,
      });

      setServiceAreas({
        primaryLocality: data.primaryLocality,
        targetAreas: data.targetAreas,
      });
      setStep("SERVICES_SELECT");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save service areas");
    }
  }

  async function handleServicesContinue() {
    try {
      setSyncing(true);
      const leafIds = getSelectedLeafIds(nodes, selectedIds);

      await syncVendorPriceNodes({
        vendorId,
        rootCategoryId:
          confirmedCategory?._id ||
          confirmedCategory?.id ||
          confirmedCategory?.categoryId,
        activeLeafCategoryIds: leafIds,
      });

      await updateVendorStatus(vendorId, "Profile Setup");

      const businessName = selectedBusiness?.name;
      const locations = [
        serviceAreas?.primaryLocality,
        ...(serviceAreas?.targetAreas || []),
      ].filter(Boolean);

      const data = await getSubdomainSuggestions(businessName, locations);
      setSubdomainSuggestions(data.suggestions || []);
      setStep("CHOOSE_DOMAIN");
    } catch (error) {
      console.error(error);
      alert(error.message || "Something went wrong");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubdomainContinue() {
    try {
      await setVendorSubdomain(vendorId, selectedSubdomain);
      setStep("PREVIEW_CHOICE");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to save website name");
    }
  }

  async function handlePreview() {
    if (!vendorId || !selectedSubdomain) {
      alert("Missing vendor or subdomain");
      return;
    }

    const previewUrl = PREVIEW_BASE_URL.replace(
      "://",
      `://${selectedSubdomain}.`
    );

    const win = window.open("about:blank", "_blank");

    try {
      await updateVendorStatus(vendorId, "Preview");
      if (win) {
        win.location.href = previewUrl;
      }
    } catch (error) {
      if (win) win.close();
      console.error(error);
      alert("Failed to open preview");
    }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-frame">
        <header className="flow-header">
          <div className="flow-header-meta">
            <span className="timer-chip">{minutes}:{seconds}</span>
            <button type="button" className="ghostButton" onClick={handleBack}>
              Back
            </button>
          </div>
          <button type="button" className="ghostButton" onClick={handleClose}>
            Exit
          </button>
        </header>

        <div className="progress-shell">
          <div className="progress-line">
            <div
              className="progress-line-fill"
              style={{ width: `${STEP_PROGRESS[step] || 0}%` }}
            />
          </div>
        </div>

        {step === "CATEGORY" ? (
          <section className="flow-card onboarding-wide">
            <p className="step-kicker">Onboarding</p>
            <h1 className="flow-title">Start your business setup</h1>
            <p className="flow-copy">
              Pick the closest category to unlock the correct onboarding path.
            </p>

            <input
              className="flow-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category..."
            />

            <div className="category-select-grid">
              {loadingCategories ? (
                <div className="loadingState">Loading categories...</div>
              ) : (
                filteredCategories.map((category) => {
                  const categoryId =
                    category._id || category.id || category.categoryId;

                  return (
                    <button
                      key={categoryId}
                      type="button"
                      className={`onboarding-category-card ${
                        selected?.name === category.name ? "active" : ""
                      }`}
                      onClick={() => setSelected(category)}
                    >
                      <img
                        src={category.imageUrl || "/placeholder.svg"}
                        alt={category.name}
                      />
                      <span>{category.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="ctaButton"
                disabled={!selected}
                onClick={() => {
                  setConfirmedCategory(selected);
                  setStep("CONNECT");
                }}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === "CONNECT" && confirmedCategory ? (
          <section className="flow-card">
            <p className="step-kicker">Category Confirmed</p>
            <h2 className="flow-title">{confirmedCategory.name}</h2>
            <div className="selected-category-preview">
              <img
                src={confirmedCategory.imageUrl || "/placeholder.svg"}
                alt={confirmedCategory.name}
              />
            </div>
            <div className="stack-actions">
              <button
                type="button"
                className="ctaButton"
                onClick={() => setStep("GOOGLE_SEARCH")}
              >
                Connect your Google Business
              </button>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setStep("VERIFY_PHONE_FORM")}
              >
                Continue with mobile number
              </button>
            </div>
          </section>
        ) : null}

        {step === "VERIFY_PHONE_FORM" ? (
          <section className="flow-card">
            <p className="step-kicker">Manual Entry</p>
            <h2 className="flow-title">Continue with mobile number</h2>
            <div className="form-stack">
              <input
                className="flow-input"
                placeholder="Business Name"
                value={manualBusinessName}
                onChange={(event) => setManualBusinessName(event.target.value)}
              />
              <div className="phone-row">
                <select
                  className="flow-select"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  <option value="91">+91</option>
                  <option value="1">+1</option>
                  <option value="44">+44</option>
                  <option value="61">+61</option>
                  <option value="971">+971</option>
                </select>
                <input
                  className="flow-input"
                  placeholder="Mobile Number"
                  value={manualPhone}
                  onChange={(event) =>
                    setManualPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                />
              </div>
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="ctaButton"
                onClick={async () => {
                  const cleanBusinessName = manualBusinessName.trim();
                  const cleanPhone = normalizePhone(manualPhone);

                  if (!cleanBusinessName) {
                    alert("Business name is required");
                    return;
                  }

                  if (!cleanPhone || cleanPhone.length !== 10) {
                    alert("Please enter a valid 10 digit phone number");
                    return;
                  }

                  setSelectedBusiness((prev) => ({
                    ...(prev || {}),
                    name: cleanBusinessName,
                    internationalPhoneNumber: cleanPhone,
                    phone: cleanPhone,
                    placeId: prev?.placeId || "",
                    address: prev?.address || "",
                    location: {
                      lat: prev?.location?.lat ?? null,
                      lng: prev?.location?.lng ?? null,
                    },
                    rating: prev?.rating ?? null,
                    userRatingsTotal: prev?.userRatingsTotal ?? 0,
                    types: Array.isArray(prev?.types) ? prev.types : [],
                  }));

                  setMobile(cleanPhone);
                  await sendOtp(cleanPhone);
                }}
              >
                {loadingOtp ? "Please wait..." : "Send OTP"}
              </button>
            </div>
          </section>
        ) : null}

        {step === "GOOGLE_SEARCH" ? (
          <section className="flow-card">
            <p className="step-kicker">Google Business</p>
            <h2 className="flow-title">Find your business listing</h2>
            <div className="form-stack">
              <input
                className="flow-input"
                value={businessQuery}
                onChange={(event) => setBusinessQuery(event.target.value)}
                placeholder="Enter your business name"
              />
              <div className="captcha-box">
                <span className="captcha-value">{captcha}</span>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => setStep("GOOGLE_SEARCH")}
                >
                  Refresh
                </button>
              </div>
              <div className="captcha-row">
                {captchaInput.map((digit, index) => (
                  <input
                    key={index}
                    id={`captcha-${index}`}
                    className="captcha-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => {
                      if (!/^[0-9]?$/.test(event.target.value)) return;
                      const next = [...captchaInput];
                      next[index] = event.target.value;
                      setCaptchaInput(next);
                    }}
                  />
                ))}
              </div>
            </div>

            {captchaError ? <p className="errorText">{captchaError}</p> : null}

            <div className="flow-actions">
              <button type="button" className="ctaButton" onClick={handleGoogleSearch}>
                Search
              </button>
            </div>
          </section>
        ) : null}

        {step === "GOOGLE_RESULTS" ? (
          <section className="flow-card onboarding-wide">
            <p className="step-kicker">Search Results</p>
            <h2 className="flow-title">Select your business</h2>
            <div className="results-list">
              {googleResults.map((business) => (
                <button
                  key={business.placeId}
                  type="button"
                  className={`result-card ${
                    activePlaceId === business.placeId ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedSearchBusiness(business);
                    setActivePlaceId(business.placeId);
                  }}
                >
                  <strong>{business.name}</strong>
                  <span>{business.address}</span>
                </button>
              ))}
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="ctaButton"
                disabled={!activePlaceId}
                onClick={fetchBusinessDetails}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === "VERIFY_PHONE" && selectedBusiness ? (
          <section className="flow-card">
            <p className="step-kicker">Verify Business</p>
            <h2 className="flow-title">Confirm business name and mobile</h2>
            <div className="form-stack">
              <input
                className="flow-input"
                placeholder="Business Name"
                value={selectedBusiness?.name || ""}
                onChange={(event) =>
                  setSelectedBusiness((prev) => ({
                    ...(prev || {}),
                    name: event.target.value,
                  }))
                }
              />
              <div className="phone-row">
                <select
                  className="flow-select"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  <option value="91">+91</option>
                </select>
                <input
                  className="flow-input"
                  placeholder="Mobile Number"
                  value={selectedBusiness?.internationalPhoneNumber || ""}
                  onChange={(event) =>
                    setSelectedBusiness((prev) => ({
                      ...(prev || {}),
                      internationalPhoneNumber: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="ctaButton"
                disabled={loadingOtp}
                onClick={() =>
                  sendOtp(
                    selectedBusiness?.internationalPhoneNumber ||
                      selectedBusiness?.phone ||
                      ""
                  )
                }
              >
                {loadingOtp ? "Please wait..." : "Send OTP"}
              </button>
            </div>

            <label className="bypass-otp-checkbox">
              <input
                type="checkbox"
                checked={bypassOtpEnabled}
                onChange={(event) => {
                  if (event.target.checked) {
                    setShowAdminPopup(true);
                  } else {
                    setBypassOtpEnabled(false);
                  }
                }}
              />
              <span>Bypass OTP</span>
            </label>

            {showAdminPopup ? (
              <div className="admin-popup-overlay">
                <div className="admin-popup-card">
                  <h3>Admin Authorization</h3>
                  <p className="muted-copy">Enter admin passcode to bypass OTP</p>

                  <input
                    type="password"
                    className="flow-input"
                    placeholder="Enter passcode"
                    value={adminPasscode}
                    onChange={(event) => setAdminPasscode(event.target.value)}
                  />

                  <div className="flow-actions">
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => {
                        setShowAdminPopup(false);
                        setAdminPasscode("");
                        setBypassOtpEnabled(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ctaButton"
                      disabled={verifyingPasscode}
                      onClick={handleVerifyAdminPasscode}
                    >
                      {verifyingPasscode ? "Verifying..." : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "VERIFY_OTP" ? (
          <section className="flow-card">
            <p className="step-kicker">OTP Verification</p>
            <h2 className="flow-title">Enter OTP</h2>
            <input
              className="flow-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />

            <div className="flow-actions">
              <button
                type="button"
                className="ctaButton"
                disabled={!otpSent || loadingOtp}
                onClick={handleVerifyOtp}
              >
                {loadingOtp ? "Please wait..." : "Verify OTP"}
              </button>
            </div>
          </section>
        ) : null}

        {step === "SUCCESS" ? (
          <section className="flow-card">
            <p className="step-kicker">Profile Registered</p>
            <h2 className="flow-title">Your profile has been registered</h2>
            <p className="flow-copy">Continue to set up trust and services.</p>
            <div className="flow-actions">
              <button type="button" className="secondaryButton" onClick={handleClose}>
                Cancel
              </button>
              <button type="button" className="ctaButton" onClick={() => setStep("TRUST")}>
                Next
              </button>
            </div>
          </section>
        ) : null}

        {step === "TRUST" ? (
          <section className="flow-card onboarding-wide">
            <p className="step-kicker">Trust Builders</p>
            <h2 className="flow-title">Build customer trust</h2>
            <p className="flow-copy">Add a few highlights customers will love.</p>

            <div className="trust-grid">
              {trustQuestions.map((question) => (
                <div key={question.id} className="trust-question-card">
                  <label>{question.id.replaceAll("_", " ")}</label>
                  {question.type === "years" ? (
                    <select
                      className="flow-select full-width"
                      value={trustAnswers[question.id] || ""}
                      onChange={(event) =>
                        setTrustAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select years</option>
                      {[...Array(51)].map((_, index) => (
                        <option key={index} value={index}>
                          {index} {index === 1 ? "year" : "years"}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {question.type === "range" ? (
                    <select
                      className="flow-select full-width"
                      value={trustAnswers[question.id] || ""}
                      onChange={(event) =>
                        setTrustAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select minimum count</option>
                      {[10, 25, 50, 100, 250, 500, 1000].map((count) => (
                        <option key={count} value={count}>
                          {count}+
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {question.type === "select" ? (
                    question.options?.length ? (
                      <select
                        className="flow-select full-width"
                        value={trustAnswers[question.id] || ""}
                        onChange={(event) =>
                          setTrustAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select option</option>
                        {question.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="flow-input"
                        value={trustAnswers[question.id] || ""}
                        onChange={(event) =>
                          setTrustAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value,
                          }))
                        }
                        placeholder="Enter value"
                      />
                    )
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setStep("SUCCESS")}
              >
                Back
              </button>
              <button type="button" className="ctaButton" onClick={handleTrustContinue}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === "SERVICE_AREAS" ? (
          <ServiceAreasStep
            vendor={{
              location: {
                lat: selectedBusiness?.location?.lat,
                lng: selectedBusiness?.location?.lng,
              },
              _id: vendorId,
            }}
            onBack={() => setStep("TRUST")}
            onNext={handleServiceAreasNext}
          />
        ) : null}

        {step === "SERVICES_SELECT" ? (
          <section className="flow-card onboarding-wide">
            <p className="step-kicker">Services</p>
            <h2 className="flow-title">Select services</h2>

            <div className="service-tree">
              {rootIds.map((id) => (
                <CategoryNode
                  key={id}
                  id={id}
                  nodes={nodes}
                  selectedIds={selectedIds}
                  toggleNode={toggleNode}
                  toggleSelect={toggleSelect}
                />
              ))}
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setStep("SERVICE_AREAS")}
              >
                Back
              </button>
              <button
                type="button"
                className="ctaButton"
                disabled={selectedIds.length === 0 || syncing}
                onClick={handleServicesContinue}
              >
                {syncing ? "Saving..." : "Continue"}
              </button>
            </div>
          </section>
        ) : null}

        {step === "CHOOSE_DOMAIN" ? (
          <section className="flow-card onboarding-wide">
            <p className="step-kicker">Website Name</p>
            <h2 className="flow-title">Choose your website name</h2>
            <p className="flow-copy">Your business will be available at:</p>

            <div className="domain-list">
              {subdomainSuggestions.map((subdomain) => (
                <button
                  key={subdomain}
                  type="button"
                  className={`domain-pill ${
                    selectedSubdomain === subdomain ? "active" : ""
                  }`}
                  onClick={() => setSelectedSubdomain(subdomain)}
                >
                  <span>{subdomain}</span>
                  <small>.ynot.com</small>
                </button>
              ))}
            </div>

            <div className="flow-actions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setStep("SERVICES_SELECT")}
              >
                Back
              </button>
              <button
                type="button"
                className="ctaButton"
                disabled={!selectedSubdomain}
                onClick={handleSubdomainContinue}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === "PREVIEW_CHOICE" ? (
          <section className="flow-card">
            <p className="step-kicker">Preview</p>
            <h2 className="flow-title">Do you want to preview your profile?</h2>
            <div className="flow-actions">
              <button type="button" className="secondaryButton" onClick={handleClose}>
                No
              </button>
              <button type="button" className="ctaButton" onClick={handlePreview}>
                Yes, Preview
              </button>
            </div>
          </section>
        ) : null}
      </section>

      {globalLoading ? (
        <div className="overlay-loader">
          <div className="spinner" />
          <p>Please wait...</p>
        </div>
      ) : null}
    </main>
  );
}

function CategoryNode({ id, nodes, selectedIds, toggleNode, toggleSelect }) {
  const node = nodes[id];
  if (!node) return null;

  const isChecked = selectedIds.includes(id);
  const isLeaf = node.children.length === 0;
  const childCount = node.children.length;

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
            {!isLeaf ? <span className="child-count-badge">{childCount}</span> : null}
          </span>
        </label>

        {!isLeaf ? (
          <button
            type="button"
            className="expand-btn"
            onClick={(event) => {
              event.stopPropagation();
              toggleNode(id);
            }}
          >
            {node.expanded ? "▾" : "▸"}
          </button>
        ) : null}
      </div>

      {node.expanded && childCount > 0 ? (
        <div className="service-children">
          {node.children.map((childId) => (
            <CategoryNode
              key={childId}
              id={childId}
              nodes={nodes}
              selectedIds={selectedIds}
              toggleNode={toggleNode}
              toggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizePhone(phone) {
  return String(phone || "")
    .replace(/\D/g, "")
    .trim()
    .slice(-10);
}
