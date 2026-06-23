"use client";

import { useEffect, useMemo, useState } from "react";
import { ENQUIRY_OPEN_EVENT } from "../../utils/enquiryFlow";
import ContactSection from "../../Contact/Contact";
import { API_BASE_URL } from "../../../config";
import "./EcommercePreviewTemplate.css";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

function normalizePhones(vendorInfo) {
  return [vendorInfo?.phone, ...(Array.isArray(vendorInfo?.secondaryPhones) ? vendorInfo.secondaryPhones : [])]
    .map((phone) => String(phone || "").trim())
    .filter(Boolean);
}

function toAnchor(label) {
  return String(label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function scrollToElementById(id) {
  if (typeof window === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getDiscountLabel(item) {
  const discountPercent = Number(item?.discountPercent || 0);
  if (discountPercent > 0) {
    return `${discountPercent}%`;
  }

  const mrp = Number(item?.mrp || 0);
  const price = Number(item?.price || 0);
  if (mrp > 0 && mrp > price) {
    const derived = Math.round(((mrp - price) / mrp) * 100);
    if (derived > 0) {
      return `${derived}%`;
    }
  }

  return "";
}

function getResolvedPricing(node) {
  const basePrice = Number(node?.price || 0) || 0;
  const configuredMrp = Number(node?.mrp || 0) || 0;
  const configuredDiscount = Math.max(0, Number(node?.discountPercent || 0) || 0);

  const mrp = configuredMrp > 0 ? configuredMrp : basePrice;

  let netPrice = basePrice;
  if (configuredDiscount > 0) {
    if (configuredMrp > 0 && basePrice > 0 && basePrice < configuredMrp) {
      netPrice = basePrice;
    } else if (mrp > 0) {
      netPrice = mrp - (mrp * configuredDiscount) / 100;
    }
  } else if (netPrice <= 0 && mrp > 0) {
    netPrice = mrp;
  }

  return {
    mrp,
    netPrice: Math.max(0, Number(netPrice.toFixed(2))),
    discountPercent: configuredDiscount,
  };
}

function collectLeafItems(nodes, pathNames = [], inheritedImageUrl = "") {
  const items = [];

  (Array.isArray(nodes) ? nodes : []).forEach((node, index) => {
    if (!node) return;

    const currentPath = [...pathNames, node.name].filter(Boolean);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const resolvedImageUrl = String(node.imageUrl || inheritedImageUrl || "").trim();

    if (node.isLeaf && node.price !== null && node.price !== undefined) {
      const subtitle = currentPath.slice(0, -1).join(" / ");
      const pricing = getResolvedPricing(node);
      const rawNode = {
        ...node,
        subtitle,
        imageUrl: resolvedImageUrl,
        price: pricing.netPrice,
        mrp: pricing.mrp,
        discountPercent: pricing.discountPercent,
      };

      items.push({
        id: node.id || node._id || `${currentPath.join("-")}-${index}`,
        cartKey: node.id || node._id || `${currentPath.join("-")}-${index}`,
        name: node.name || "Item",
        subtitle,
        itemCode: node.itemCode || "",
        unitLabel: node.unitLabel || "",
        imageUrl: resolvedImageUrl,
        price: pricing.netPrice,
        mrp: pricing.mrp,
        discountPercent: pricing.discountPercent,
        minQty: Math.max(1, Number(node.minQty) || 1),
        stepQty: Math.max(1, Number(node.stepQty) || 1),
        isOrderable: node.isOrderable !== false,
        rawNode,
      });
      return;
    }

    if (hasChildren) {
      items.push(...collectLeafItems(node.children, currentPath, resolvedImageUrl));
    }
  });

  return items;
}

function buildSections(menuTree) {
  return (Array.isArray(menuTree) ? menuTree : [])
    .map((section, index) => {
      const items = section?.isLeaf
        ? collectLeafItems([section], [])
        : collectLeafItems(section?.children || [], [section?.name].filter(Boolean));

      if (!items.length) return null;

      return {
        id: section?.id || section?._id || `section-${index}`,
        title: section?.name || `Section ${index + 1}`,
        anchor: toAnchor(section?.name || `section-${index}`),
        itemCount: items.length,
        items,
      };
    })
    .filter(Boolean);
}

function getCartItem(cartItems, item) {
  return (Array.isArray(cartItems) ? cartItems : []).find(
    (entry) => (entry.cartKey || entry.itemId) === item.cartKey
  );
}

export default function EcommercePreviewTemplate({
  vendorInfo,
  category,
  menuTree,
  mergedHeroImages,
  heroTagline,
  heroDescription,
  cartItems,
  cartTotal,
  onAddToCart,
  onIncreaseQty,
  onDecreaseQty,
  onClearCart,
  onOpenAdmin,
  showAdminMenu,
  onToggleAdminMenu,
  onOpenAdminMenu,
  onOpenAdminDashboard,
}) {
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    paymentEnabled: false,
    provider: "",
    keyId: "",
  });
  const sections = useMemo(() => buildSections(menuTree), [menuTree]);
  const phoneNumbers = useMemo(() => normalizePhones(vendorInfo), [vendorInfo]);
  const vendorId =
    vendorInfo?.vendorId ||
    vendorInfo?._id ||
    vendorInfo?.vendor?._id ||
    null;
  const isRazorpayCheckoutEnabled =
    paymentConfig.paymentEnabled &&
    paymentConfig.provider === "razorpay" &&
    Boolean(String(paymentConfig.keyId || "").trim());
  const ecommercePrimaryCtaLabel = isRazorpayCheckoutEnabled ? "Checkout" : "Place Order";
  const ecommerceSubmitLabel = isRazorpayCheckoutEnabled ? "Proceed to Payment" : "Place Order";

  const heroImage = useMemo(() => {
    const previewImages = Array.isArray(mergedHeroImages)
      ? mergedHeroImages.map((image) => String(image || "").trim()).filter(Boolean)
      : [];
    if (previewImages.length > 0) return previewImages[0];

    for (const section of sections) {
      const firstImage = section.items.find((item) => item.imageUrl)?.imageUrl;
      if (firstImage) return firstImage;
    }

    return "";
  }, [mergedHeroImages, sections]);

  const cartMrpTotal = useMemo(
    () =>
      (Array.isArray(cartItems) ? cartItems : []).reduce((sum, item) => {
        const referencePrice = Number(item.mrp) > 0 ? Number(item.mrp) : Number(item.price) || 0;
        return sum + referencePrice * (Number(item.qty) || 0);
      }, 0),
    [cartItems]
  );
  const cartDiscountTotal = Math.max(cartMrpTotal - Number(cartTotal || 0), 0);
  const detailedCartItems = useMemo(
    () =>
      (Array.isArray(cartItems) ? cartItems : []).map((item, index) => {
        const qty = Number(item?.qty || 0) || 0;
        const mrp = Number(item?.mrp || 0) > 0 ? Number(item.mrp) : Number(item?.price || 0) || 0;
        const unitPrice = Number(item?.price || 0) || 0;
        const grossTotal = mrp * qty;
        const netTotal = unitPrice * qty;

        return {
          id: String(item?.cartKey || item?.itemId || `cart-item-${index}`),
          name: item?.name || "Selected item",
          subtitle: String(item?.subtitle || "").trim(),
          metaLine: item?.itemCode || item?.unitLabel || "",
          imageUrl: String(item?.imageUrl || "").trim(),
          qty,
          mrp,
          unitPrice,
          grossTotal,
          netTotal,
          savings: Math.max(grossTotal - netTotal, 0),
        };
      }),
    [cartItems]
  );

  useEffect(() => {
    if (!vendorId) {
      setPaymentConfig({
        paymentEnabled: false,
        provider: "",
        keyId: "",
      });
      return;
    }

    let cancelled = false;

    async function loadPaymentConfig() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/vendor-payment-config/${vendorId}`,
          { cache: "no-store" }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        const config = data?.config || {};
        setPaymentConfig({
          paymentEnabled: Boolean(config.paymentEnabled),
          provider: String(config.provider || ""),
          keyId: String(config?.razorpay?.keyId || ""),
        });
      } catch (error) {
        console.error("Ecommerce payment config fetch failed", error);
        if (!cancelled) {
          setPaymentConfig({
            paymentEnabled: false,
            provider: "",
            keyId: "",
          });
        }
      }
    }

    loadPaymentConfig();

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const handlePlaceOrder = () => {
    if (typeof window !== "undefined") {
      if (!showCheckoutForm) {
        setShowCheckoutForm(true);
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent(ENQUIRY_OPEN_EVENT, { detail: { source: "ecommerce-template" } }));
        }, 120);
        return;
      }

      window.dispatchEvent(new CustomEvent(ENQUIRY_OPEN_EVENT, { detail: { source: "ecommerce-template" } }));
    }
    scrollToElementById("ecommerce-contact");
  };

  return (
    <div className="ecommerce-preview">
      <section className="ecommerce-topbar">
        <div className="ecommerce-brand">
          {typeof vendorInfo?.logoUrl === "string" && vendorInfo.logoUrl.trim() ? (
            <img
              src={vendorInfo.logoUrl.trim()}
              alt={`${vendorInfo?.businessName || "Business"} logo`}
              className="ecommerce-brand-logo"
            />
          ) : (
            <div className="ecommerce-brand-fallback">
              {(vendorInfo?.businessName || category?.name || "B").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="ecommerce-brand-name">{vendorInfo?.businessName || "Product Catalog"}</div>
            <div className="ecommerce-brand-subtitle">{category?.name || "Browse and place your order"}</div>
          </div>
        </div>

        <nav className="ecommerce-nav">
          <button type="button" onClick={() => scrollToElementById("ecommerce-home")}>Home</button>
          <button type="button" onClick={() => scrollToElementById("ecommerce-catalog")}>Catalog</button>
          <button type="button" onClick={() => scrollToElementById("ecommerce-summary")}>Summary</button>
          <button type="button" onClick={() => scrollToElementById("ecommerce-contact")}>Contact</button>
          {typeof onOpenAdmin === "function" ? (
            <div className="ecommerce-admin-menu">
              <button
                type="button"
                className="ecommerce-admin-button"
                onClick={onToggleAdminMenu || onOpenAdmin}
              >
                Admin
              </button>
              {showAdminMenu ? (
                <div className="ecommerce-admin-dropdown">
                  <button type="button" onClick={onOpenAdminMenu}>
                    Menu
                  </button>
                  <button type="button" onClick={onOpenAdminDashboard}>
                    Dashboard
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
      </section>

      <section id="ecommerce-home" className="ecommerce-hero">
        <div className="ecommerce-hero-copy">
          <p className="ecommerce-kicker">{category?.name || "Ecommerce"}</p>
          <h1>{heroTagline || vendorInfo?.businessName || "Build your order"}</h1>
          <p>
            {heroDescription ||
              vendorInfo?.location?.address ||
              "Browse products, adjust quantities and share the order with the business."}
          </p>
          <div className="ecommerce-hero-actions">
            <button type="button" className="ecommerce-primary-button" onClick={() => scrollToElementById("ecommerce-catalog")}>
              View Catalog
            </button>
            {phoneNumbers[0] ? (
              <a className="ecommerce-secondary-button" href={`tel:${phoneNumbers[0]}`}>
                Call Now
              </a>
            ) : null}
          </div>
        </div>

        <div className="ecommerce-hero-media">
          {heroImage ? (
            <img src={heroImage} alt={heroTagline || vendorInfo?.businessName || "Catalog preview"} />
          ) : (
            <div className="ecommerce-hero-placeholder">Catalog Preview</div>
          )}
        </div>
      </section>

      <section className="ecommerce-summary-strip">
        <div>
          <span>Total MRP</span>
          <strong>{formatCurrency(cartMrpTotal)}</strong>
        </div>
        <div>
          <span>Discount</span>
          <strong>{formatCurrency(cartDiscountTotal)}</strong>
        </div>
        <div>
          <span>Net Pay</span>
          <strong>{formatCurrency(cartTotal)}</strong>
        </div>
        <div className="ecommerce-summary-actions">
          <button type="button" className="ecommerce-primary-button" onClick={handlePlaceOrder}>
            {ecommercePrimaryCtaLabel}
          </button>
          <button type="button" className="ecommerce-secondary-button" onClick={onClearCart} disabled={!cartItems?.length}>
            Clear
          </button>
        </div>
      </section>

      <section id="ecommerce-catalog" className="ecommerce-catalog">
        <div className="ecommerce-catalog-heading">
          <div>
            <h2>Product Catalog</h2>
            <p>Enter quantities below. Totals update instantly.</p>
          </div>
          <div className="ecommerce-section-pills">
            {sections.map((section) => (
              <button key={section.id} type="button" onClick={() => scrollToElementById(section.anchor)}>
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {!sections.length ? (
          <div className="ecommerce-empty-state">
            No active priced items were found in My Menu for this template yet.
          </div>
        ) : null}

        {sections.map((section) => (
          <div key={section.id} id={section.anchor} className="ecommerce-section-card">
            <div className="ecommerce-section-header">
              <h3>{section.title}</h3>
              <span>{section.itemCount} items</span>
            </div>

            <div className="ecommerce-table">
              <div className="ecommerce-table-head">
                <span>#</span>
                <span>Product Name</span>
                <span>Qty</span>
                <span>MRP / Unit</span>
                <span>Discount</span>
                <span>Gross Amt</span>
                <span>Net Pay</span>
              </div>

              {section.items.map((item, index) => {
                const cartItem = getCartItem(cartItems, item);
                const qty = Number(cartItem?.qty || 0);
                const discountLabel = getDiscountLabel(item);
                const referenceMrp = Number(item.mrp) > 0 ? Number(item.mrp) : null;
                const effectiveMrp = referenceMrp || Number(item.price) || 0;
                const grossAmount = qty > 0 ? effectiveMrp * qty : 0;
                const netAmount = qty > 0 ? (Number(item.price) || 0) * qty : 0;
                const savingsAmount = Math.max(grossAmount - netAmount, 0);

                return (
                  <div
                    key={item.id}
                    className={`ecommerce-table-row${qty > 0 ? " ecommerce-table-row--active" : ""}`}
                  >
                    <span className="ecommerce-row-index">{String(index + 1).padStart(2, "0")}</span>

                    <div className="ecommerce-product-cell">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="ecommerce-product-image" />
                      ) : (
                        <div className="ecommerce-product-image ecommerce-product-image--placeholder">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong>{item.name}</strong>
                        {item.itemCode ? <small>{item.itemCode}</small> : null}
                        {item.subtitle ? <p>{item.subtitle}</p> : null}
                      </div>
                    </div>

                    <div className="ecommerce-qty-cell">
                      {qty > 0 ? (
                        <div className="ecommerce-qty-control">
                          <button type="button" onClick={() => onDecreaseQty(item.cartKey)}>-</button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => onIncreaseQty(item.cartKey)}>+</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="ecommerce-add-button"
                          onClick={() => onAddToCart(item.rawNode)}
                          disabled={!item.isOrderable}
                        >
                          {item.isOrderable ? "Add" : "Unavailable"}
                        </button>
                      )}
                      {(item.minQty > 1 || item.stepQty > 1 || item.unitLabel) ? (
                        <small>
                          Min {item.minQty}
                          {item.stepQty > 1 ? ` • Step ${item.stepQty}` : ""}
                          {item.unitLabel ? ` • ${item.unitLabel}` : ""}
                        </small>
                      ) : null}
                    </div>

                    <div className="ecommerce-mobile-compact-row">
                      <div className="ecommerce-mobile-compact-main">
                        <div className="ecommerce-mobile-compact-group ecommerce-mobile-compact-group--qty">
                          {qty > 0 ? (
                            <div className="ecommerce-qty-control">
                              <button type="button" onClick={() => onDecreaseQty(item.cartKey)}>-</button>
                              <span>{qty}</span>
                              <button type="button" onClick={() => onIncreaseQty(item.cartKey)}>+</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="ecommerce-add-button"
                              onClick={() => onAddToCart(item.rawNode)}
                              disabled={!item.isOrderable}
                            >
                              {item.isOrderable ? "Add" : "Unavailable"}
                            </button>
                          )}
                        </div>

                        <div className="ecommerce-mobile-compact-group">
                          <span className="ecommerce-mobile-compact-label">MRP</span>
                          {referenceMrp ? <strong>{formatCurrency(referenceMrp)}</strong> : <strong>{formatCurrency(item.price)}</strong>}
                        </div>

                        <div className="ecommerce-mobile-compact-group">
                          <span className="ecommerce-mobile-compact-label">Discount</span>
                          {discountLabel ? <span className="ecommerce-discount-badge">{discountLabel}</span> : <span className="ecommerce-mobile-compact-empty">--</span>}
                        </div>
                      </div>

                      <div className="ecommerce-mobile-net-group">
                        <span className="ecommerce-mobile-compact-label">Net</span>
                        {qty > 0 ? (
                          <>
                            <strong>{formatCurrency(netAmount)}</strong>
                            {savingsAmount > 0 ? <small>save {formatCurrency(savingsAmount)}</small> : null}
                          </>
                        ) : (
                          <strong>{formatCurrency(item.price)}</strong>
                        )}
                      </div>
                    </div>

                    <div className="ecommerce-price-cell">
                      {referenceMrp ? <strong>{formatCurrency(referenceMrp)}</strong> : <strong>{formatCurrency(item.price)}</strong>}
                      {referenceMrp && referenceMrp > item.price ? <small>{formatCurrency(item.price)}</small> : null}
                    </div>

                    <div className="ecommerce-discount-cell">
                      {discountLabel ? <span className="ecommerce-discount-badge">{discountLabel}</span> : <span>--</span>}
                    </div>

                    <div className="ecommerce-gross-cell">
                      {qty > 0 ? <strong>{formatCurrency(grossAmount)}</strong> : <span>--</span>}
                    </div>

                    <div className="ecommerce-netpay-cell">
                      {qty > 0 ? (
                        <>
                          <strong>{formatCurrency(netAmount)}</strong>
                          {savingsAmount > 0 ? <small>save {formatCurrency(savingsAmount)}</small> : null}
                        </>
                      ) : (
                        <strong>{formatCurrency(item.price)}</strong>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section id="ecommerce-summary" className="ecommerce-bottom-grid">
        <div className="ecommerce-note-card">
          <h3>Order Notes</h3>
          <p>
            {isRazorpayCheckoutEnabled
              ? "All prices shown here use the vendor's current My Menu pricing. Order confirmation and delivery follow the existing Sameep flow, and payment will be collected during checkout."
              : "All prices shown here use the vendor's current My Menu pricing. Order confirmation and delivery follow the existing Sameep flow, and payment will be collected offline by the vendor after the order is placed."}
          </p>
          <p>
            {vendorInfo?.location?.address || "Location details will be shared by the vendor after order confirmation."}
          </p>
          <div className="ecommerce-contact-pills">
            {phoneNumbers.map((phone) => (
              <a key={phone} href={`tel:${phone}`}>
                {phone}
              </a>
            ))}
            {vendorInfo?.email ? <a href={`mailto:${vendorInfo.email}`}>{vendorInfo.email}</a> : null}
          </div>
        </div>

        <aside className="ecommerce-order-card">
          <h3>Order Summary</h3>
          <div className="ecommerce-order-line">
            <span>Total Amount (MRP)</span>
            <strong>{formatCurrency(cartMrpTotal)}</strong>
          </div>
          <div className="ecommerce-order-line">
            <span>Discount Amount</span>
            <strong>- {formatCurrency(cartDiscountTotal)}</strong>
          </div>
          <div className="ecommerce-order-total">
            <span>Net Pay</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>
          {detailedCartItems.length > 0 ? (
            <div className="ecommerce-cart-details">
              <button
                type="button"
                className="ecommerce-cart-toggle"
                onClick={() => setShowCartDetails((current) => !current)}
              >
                <span>Cart Details ({detailedCartItems.length})</span>
                <span>{showCartDetails ? "Hide" : "Show"}</span>
              </button>

              {showCartDetails ? (
                <div className="ecommerce-cart-list">
                  {detailedCartItems.map((item) => (
                    <div key={item.id} className="ecommerce-cart-list-item">
                      <div className="ecommerce-cart-list-main">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="ecommerce-cart-list-image" />
                        ) : (
                          <div className="ecommerce-cart-list-image ecommerce-cart-list-image--placeholder">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <strong>{item.name}</strong>
                          {item.subtitle ? <small>{item.subtitle}</small> : null}
                          <small>
                            Qty {item.qty}
                            {item.metaLine ? ` • ${item.metaLine}` : ""}
                          </small>
                          <small>
                            {formatCurrency(item.unitPrice)} each
                            {item.mrp > item.unitPrice ? ` • MRP ${formatCurrency(item.mrp)}` : ""}
                          </small>
                        </div>
                      </div>
                      <div className="ecommerce-cart-list-total">
                        <strong>{formatCurrency(item.netTotal)}</strong>
                        {item.savings > 0 ? <small>save {formatCurrency(item.savings)}</small> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {!showCheckoutForm ? (
            <button type="button" className="ecommerce-primary-button ecommerce-full-width" onClick={handlePlaceOrder}>
              {ecommercePrimaryCtaLabel}
            </button>
          ) : (
            <div id="ecommerce-contact" className="ecommerce-inline-checkout">
              <ContactSection
                mode="inline"
                showCartSummary={false}
                sectionId="ecommerce-contact"
                hideHeader={true}
                submitLabel={ecommerceSubmitLabel}
              />
            </div>
          )}
          <button
            type="button"
            className="ecommerce-secondary-button ecommerce-full-width"
            onClick={onClearCart}
            disabled={!cartItems?.length}
          >
            Clear All Items
          </button>
        </aside>
      </section>

    </div>
  );
}
