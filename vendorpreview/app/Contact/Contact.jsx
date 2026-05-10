"use client";

import "./Contact.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaPhoneAlt, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { useVendor } from "@/app/context/VendorContext";
import { API_BASE_URL } from "../../config";
import {
  buildVendorPreviewAnalyticsPayload,
  trackVendorPreviewEvent,
} from "../utils/siteAnalytics";
import {
  CART_UPDATED_EVENT,
  ENQUIRY_OPEN_EVENT,
  formatCurrency,
  getCommonPathPrefix,
  getEnquiryFieldLabel,
  getEnquiryFieldPlaceholder,
  getEnquiryInputMode,
  getEnquiryInputType,
  getEnquiryTypeLabel,
  getCartHierarchyLabel,
  getTimeSlotOptionsForDate,
  isLikelyPhoneField,
  mergeDateTimeValue,
  normalizeCartItems,
  sanitizeEnquiryValue,
  splitDateTimeValue,
} from "../utils/enquiryFlow";

function buildDefaultFallbackFields() {
  return [
    { name: "Name", fieldType: "text", required: true, enabled: true },
    { name: "Phone Number", fieldType: "phone", required: true, enabled: true },
    { name: "Your Message", fieldType: "text", required: false, enabled: true },
  ];
}

export default function ContactSection() {
  const { vendorInfo } = useVendor() || {};
  const formRef = useRef(null);
  const firstInputRef = useRef(null);

  const rootCategoryId =
    vendorInfo?.categoryId ||
    vendorInfo?.category?._id ||
    vendorInfo?.rootCategoryId ||
    null;

  const vendorId =
    vendorInfo?.vendorId ||
    vendorInfo?._id ||
    vendorInfo?.vendor?._id ||
    null;

  const [categoryData, setCategoryData] = useState(null);
  const [cartState, setCartState] = useState(() => {
    if (typeof window === "undefined") {
      return { vendorId: "", rootCategoryId: "", cartItems: [], cartTotal: 0 };
    }

    return window.__ynotCartState || {
      vendorId: "",
      rootCategoryId: "",
      cartItems: [],
      cartTotal: 0,
    };
  });
  const [formValues, setFormValues] = useState({});
  const [selectedServiceInterest, setSelectedServiceInterest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!rootCategoryId) return;

    let cancelled = false;

    async function loadCategory() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dummy-categories/${rootCategoryId}`,
          { cache: "no-store" }
        );

        const data = await response.json();
        if (cancelled) return;
        setCategoryData(Array.isArray(data) ? data[0] : data);
      } catch (error) {
        console.error("Contact category fetch failed", error);
        if (!cancelled) setCategoryData(null);
      }
    }

    loadCategory();

    return () => {
      cancelled = true;
    };
  }, [rootCategoryId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleCartUpdated = (event) => {
      const detail = event?.detail || {};
      setCartState({
        vendorId: String(detail?.vendorId || ""),
        rootCategoryId: String(detail?.rootCategoryId || ""),
        cartItems: Array.isArray(detail?.cartItems) ? detail.cartItems : [],
        cartTotal: Number(detail?.cartTotal || 0) || 0,
      });
    };

    const handleOpenEnquiry = () => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        firstInputRef.current?.focus();
      }, 250);
    };

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    window.addEventListener(ENQUIRY_OPEN_EVENT, handleOpenEnquiry);

    if (window.__ynotCartState) {
      handleCartUpdated({ detail: window.__ynotCartState });
    }

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
      window.removeEventListener(ENQUIRY_OPEN_EVENT, handleOpenEnquiry);
    };
  }, []);

  const enquiryConfig = categoryData?.enquiryConfig || null;
  const isEnquiryFlowEnabled = Boolean(enquiryConfig?.enabled);
  const enquiryTypeLabel = getEnquiryTypeLabel(enquiryConfig?.enquiryType);
  const supportedEnquiryFields = useMemo(() => {
    if (isEnquiryFlowEnabled) {
      return (Array.isArray(enquiryConfig?.fields) ? enquiryConfig.fields : [])
        .filter((field) => field?.enabled !== false && String(field?.name || "").trim());
    }

    return buildDefaultFallbackFields();
  }, [enquiryConfig, isEnquiryFlowEnabled]);
  const requiresCartSelection = Boolean(isEnquiryFlowEnabled && enquiryConfig?.cartBasedEnquiry);
  const normalizedCartItems = useMemo(
    () => normalizeCartItems(cartState?.cartItems || []),
    [cartState]
  );
  const serviceInterestOptions = normalizedCartItems.map((item) => ({
    value: item.cartKey,
    label: `${item.label} x${item.qty}${item.total > 0 ? ` • ${formatCurrency(item.total)}` : ""}`,
  }));
  const activeServiceInterest =
    serviceInterestOptions.some((option) => option.value === selectedServiceInterest)
      ? selectedServiceInterest
      : serviceInterestOptions[0]?.value || "";
  const effectiveCartItems = useMemo(() => {
    if (!requiresCartSelection) return normalizedCartItems;
    if (!activeServiceInterest) return normalizedCartItems;
    return normalizedCartItems.filter((item) => item.cartKey === activeServiceInterest);
  }, [activeServiceInterest, normalizedCartItems, requiresCartSelection]);
  const cartSummary = useMemo(() => {
    return effectiveCartItems
      .map((item) => `${item.label} x${item.qty}${item.total > 0 ? ` • ${formatCurrency(item.total)}` : ""}`)
      .join(", ");
  }, [effectiveCartItems]);

  useEffect(() => {
    setFormValues((prev) => {
      const next = {};
      supportedEnquiryFields.forEach((field) => {
        next[field.name] = prev[field.name] || "";
      });
      return next;
    });
  }, [supportedEnquiryFields]);

  const phoneField = useMemo(
    () => supportedEnquiryFields.find((field) => isLikelyPhoneField(field)),
    [supportedEnquiryFields]
  );

  const phone =
    vendorInfo?.phone ||
    vendorInfo?.contact?.phone;
  const secondaryPhones = Array.isArray(vendorInfo?.secondaryPhones)
    ? vendorInfo.secondaryPhones.filter(Boolean)
    : [];
  const location = vendorInfo?.location || {};
  const businessHours = vendorInfo?.businessHours || vendorInfo?.hours || [];

  const handleFieldChange = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field.name]: sanitizeEnquiryValue(field, value),
    }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    if (!vendorId || !rootCategoryId) {
      setFeedback("Vendor details are missing. Unable to submit enquiry.");
      return;
    }

    if (requiresCartSelection && normalizedCartItems.length === 0) {
      setFeedback("Add items to cart to send enquiry.");
      return;
    }

    if (requiresCartSelection && !activeServiceInterest && normalizedCartItems.length > 0) {
      setFeedback("Please choose the service interest from your selected items.");
      return;
    }

    const nextAttributes = {};

    for (const field of supportedEnquiryFields) {
      const rawValue = String(formValues[field.name] || "").trim();
      if (field.required && !rawValue) {
        setFeedback(`${getEnquiryFieldLabel(field)} is required.`);
        return;
      }

      if (rawValue) {
        nextAttributes[getEnquiryFieldLabel(field)] = rawValue;
      }
    }

    const phoneValue = phoneField ? String(formValues[phoneField.name] || "").trim() : "";
    if (phoneField && phoneValue.length !== 10) {
      setFeedback("Enter a valid 10 digit mobile number.");
      return;
    }

    let storedUser = {};
    if (typeof window !== "undefined") {
      try {
        storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
      } catch {
        storedUser = {};
      }
    }

    const aggregateCategoryPath = getCommonPathPrefix(
      effectiveCartItems.map((item) => item.categoryPath)
    );
    const aggregateCategoryIds = [
      ...new Set(
        effectiveCartItems.flatMap((item) => item.categoryPathIds || []).filter(Boolean)
      ),
    ];
    const totalQty = effectiveCartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const totalPrice = effectiveCartItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const serviceNameSummary =
      effectiveCartItems.length > 1
        ? `${effectiveCartItems[0]?.name || enquiryTypeLabel} +${effectiveCartItems.length - 1} more`
        : effectiveCartItems[0]?.name || categoryData?.name || enquiryTypeLabel;
    const sourceSummary =
      aggregateCategoryPath[0] ||
      effectiveCartItems[0]?.categoryPath?.[0] ||
      categoryData?.name ||
      "classic-preview";
    const selectedInterestItem = normalizedCartItems.find(
      (item) => item.cartKey === activeServiceInterest
    );

    if (cartSummary) {
      nextAttributes.inventoryName = cartSummary;
      nextAttributes.inventoryNames = effectiveCartItems.map((item) => item.label);
    }

    const payload = {
      vendorId: String(vendorId),
      categoryId: String(rootCategoryId),
      customerId: storedUser?.customerId ? String(storedUser.customerId) : "",
      phone: phoneValue || String(storedUser?.phone || "").trim(),
      serviceName: serviceNameSummary,
      source: sourceSummary,
      categoryPath: aggregateCategoryPath,
      categoryIds: aggregateCategoryIds.length > 0 ? aggregateCategoryIds : [String(rootCategoryId)],
      attributes: nextAttributes,
      price: totalPrice > 0 ? totalPrice : null,
      terms: "",
      meta: {
        template: "classic-preview",
        enquiryType: String(enquiryConfig?.enquiryType || "").trim(),
        serviceInterest: activeServiceInterest || "",
        serviceInterestLabel: selectedInterestItem ? getCartHierarchyLabel(selectedInterestItem) : "",
        cartQty: totalQty,
        cartLineCount: effectiveCartItems.length,
        cartItems: effectiveCartItems,
        cartSummary,
      },
    };

    try {
      setIsSubmitting(true);
      setFeedback("");

      const response = await fetch(`${API_BASE_URL}/api/enquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(data?.message || "Failed to submit enquiry.");
        return;
      }

      setFeedback("Enquiry submitted successfully.");
      trackVendorPreviewEvent(
        API_BASE_URL,
        buildVendorPreviewAnalyticsPayload({
          vendorId,
          eventType: "enquiry_submit",
          meta: {
            sourceLabel: String(enquiryConfig?.enquiryType || "service_enquiry") || "service_enquiry",
            utmContent: String(rootCategoryId || ""),
          },
        })
      );
      setFormValues(
        supportedEnquiryFields.reduce((acc, field) => {
          acc[field.name] = "";
          return acc;
        }, {})
      );
      setSelectedServiceInterest("");
    } catch (error) {
      console.error("Enquiry submission failed", error);
      setFeedback("Failed to submit enquiry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!vendorInfo) return null;

  return (
    <section id="contact" className="contact-section">
      <h2 className="contact-title">{enquiryTypeLabel}</h2>
      <p className="contact-subtitle">
        Share your details and we will review your enquiry shortly.
      </p>

      <div className="contact-grid">
        <div className="contact-left">
          <div className="contact-card">
            <div className="card-header">
              <FaPhoneAlt className="icon" />
              <h3>Call Us</h3>
            </div>
            <p className="contact-info">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  onClick={() =>
                    trackVendorPreviewEvent(
                      API_BASE_URL,
                      buildVendorPreviewAnalyticsPayload({
                        vendorId,
                        eventType: "cta_click",
                        meta: { sourceLabel: "contact_phone_primary" },
                      })
                    )
                  }
                >
                  {phone}
                </a>
              ) : (
                "Phone not available"
              )}
            </p>
            {secondaryPhones.length > 0 && (
              <div className="contact-secondary-list">
                {secondaryPhones.map((secondaryPhone) => (
                  <a
                    key={secondaryPhone}
                    className="contact-secondary-link"
                    href={`tel:${secondaryPhone}`}
                    onClick={() =>
                      trackVendorPreviewEvent(
                        API_BASE_URL,
                        buildVendorPreviewAnalyticsPayload({
                          vendorId,
                          eventType: "cta_click",
                          meta: { sourceLabel: "contact_phone_secondary" },
                        })
                      )
                    }
                  >
                    {secondaryPhone}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="contact-card">
            <div className="card-header">
              <FaMapMarkerAlt className="icon" />
              <h3>Our Location</h3>
            </div>

            <p className="contact-info">
              {location?.address || "Location not available"}
            </p>

            {location?.lat && location?.lng && (
              <div className="map-box">
                <iframe
                  title="map"
                  width="100%"
                  height="200"
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                />
              </div>
            )}
          </div>

          <div className="contact-card">
            <div className="card-header">
              <FaClock className="icon" />
              <h3>Business Hours</h3>
            </div>

            <ul className="hours-list">
              {Array.isArray(businessHours) && businessHours.length > 0 ? (
                businessHours.map((bh, index) => (
                  <li key={bh._id || index}>
                    <span>{bh.day}</span>
                    <span>{bh.hours || "Closed"}</span>
                  </li>
                ))
              ) : (
                <li>Business hours not available</li>
              )}
            </ul>
          </div>
        </div>

        <div className="contact-right">
          <form ref={formRef} className="contact-form-card" onSubmit={handleSubmit}>
            {normalizedCartItems.length > 0 ? (
              <div className="contact-cart-card">
                <div className="contact-cart-head">
                  <h3>Selected Items</h3>
                  <span>{formatCurrency(cartState?.cartTotal || 0)}</span>
                </div>
                <div className="contact-cart-list">
                  {normalizedCartItems.map((item) => (
                    <div key={item.cartKey} className="contact-cart-row">
                      <div className="contact-cart-row-copy">
                        <strong>{item.label}</strong>
                        <span>Qty {item.qty}</span>
                      </div>
                      <div className="contact-cart-row-total">{formatCurrency(item.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {requiresCartSelection && normalizedCartItems.length > 0 ? (
              <select
                className="contact-select"
                value={activeServiceInterest}
                onChange={(event) => setSelectedServiceInterest(event.target.value)}
              >
                <option value="">Select service interest</option>
                {serviceInterestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}

            {supportedEnquiryFields.map((field, index) => {
              const inputType = getEnquiryInputType(field?.fieldType);
              const isDateTimeField = inputType === "datetime-local";
              const dateTimeValue = splitDateTimeValue(formValues[field.name] || "");
              const dateAwareTimeSlots = isDateTimeField
                ? getTimeSlotOptionsForDate(businessHours, dateTimeValue.date)
                : [];
              const hasAvailableDateSlots = dateAwareTimeSlots.length > 0;
              const commonProps = {
                value: formValues[field.name] || "",
                onChange: (event) => handleFieldChange(field, event.target.value),
                placeholder: getEnquiryFieldPlaceholder(field),
                required: Boolean(field?.required),
                inputMode: getEnquiryInputMode(field),
              };

              if (inputType === "textarea") {
                return (
                  <textarea
                    key={field.name}
                    ref={index === 0 ? firstInputRef : undefined}
                    {...commonProps}
                  />
                );
              }

              const shouldUseTextarea =
                inputType === "text" &&
                String(getEnquiryFieldLabel(field)).toLowerCase().includes("message");

              if (shouldUseTextarea) {
                return (
                  <textarea
                    key={field.name}
                    ref={index === 0 ? firstInputRef : undefined}
                    {...commonProps}
                  />
                );
              }

              if (isDateTimeField) {
                return (
                  <div key={field.name} className="contact-datetime-group">
                    <div className="contact-date-wrap">
                      <input
                        ref={index === 0 ? firstInputRef : undefined}
                        type="date"
                        value={dateTimeValue.date}
                        onChange={(event) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [field.name]: mergeDateTimeValue(
                              event.target.value,
                              ""
                            ),
                          }))
                        }
                        required={Boolean(field?.required)}
                      />
                    </div>
                    <select
                      className="contact-select"
                      value={dateTimeValue.time}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.name]: mergeDateTimeValue(
                            dateTimeValue.date,
                            event.target.value
                          ),
                        }))
                      }
                      disabled={Boolean(dateTimeValue.date) && !hasAvailableDateSlots}
                    >
                      <option value="">
                        {Boolean(dateTimeValue.date) && !hasAvailableDateSlots
                          ? "No slots available"
                          : "Select time"}
                      </option>
                      {dateAwareTimeSlots.map((slot) => (
                        <option key={`${field.name}-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <input
                  key={field.name}
                  ref={index === 0 ? firstInputRef : undefined}
                  type={inputType}
                  {...commonProps}
                />
              );
            })}

            {feedback ? (
              <div className={`contact-feedback ${feedback.includes("successfully") ? "success" : "error"}`}>
                {feedback}
              </div>
            ) : null}

            <button
              className="send-btn"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : enquiryTypeLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
