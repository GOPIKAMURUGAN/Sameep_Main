"use client";

import { useMemo, useState } from "react";
import "./ModernPreviewTemplate.css";

const DEFAULT_NAV = [
  { label: "Services", href: "#services" },
  { label: "Our Story", href: "#our-story" },
  { label: "Contact", href: "#contact" },
];

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return "Contact";
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function toAnchor(label) {
  return String(label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function getCardImage(card) {
  if (card?.img) return card.img;

  if (Array.isArray(card?.options)) {
    for (const option of card.options) {
      if (option?.imageUrl) return option.imageUrl;

      if (Array.isArray(option?.subOptions)) {
        for (const subOption of option.subOptions) {
          if (subOption?.imageUrl) return subOption.imageUrl;
        }
      }
    }
  }

  return "";
}

function getCardDescription(card) {
  if (Array.isArray(card?.terms) && card.terms.length > 0) {
    return card.terms.slice(0, 2).join(" • ");
  }
  if (card?.offerText?.trim()) return card.offerText.trim();
  return "";
}

function getOfferCard(orderedCategories) {
  const offerSection = (orderedCategories || []).find(
    (section) => String(section?.sectionName || "").trim().toLowerCase() === "offers"
  );

  if (!offerSection || !Array.isArray(offerSection.cards) || offerSection.cards.length === 0) {
    return null;
  }

  return offerSection.cards[0];
}

function isDisplayableCard(card) {
  if (!card) return false;
  if (card.simple) return true;
  if (Number(card.base || 0) > 0) return true;
  if (Array.isArray(card.terms) && card.terms.length > 0) return true;
  if (typeof card.offerText === "string" && card.offerText.trim()) return true;
  if (typeof card.packagesIncludes === "string" && card.packagesIncludes.trim()) return true;
  if (Array.isArray(card.options) && card.options.length > 0) return true;
  return false;
}

function ModernServiceRow({ card, onOpenMenu }) {
  const [selectedMain, setSelectedMain] = useState(card?.defaultMain || card?.options?.[0]?.label || null);
  const [selectedSub, setSelectedSub] = useState(card?.defaultSub || null);
  const [selectedSubSub, setSelectedSubSub] = useState(null);

  const mainOption =
    card?.options?.find((option) => option.label === selectedMain) ||
    card?.options?.[0] ||
    null;
  const effectiveSelectedMain = mainOption?.label || null;

  const secondaryOptions = Array.isArray(mainOption?.subOptions) ? mainOption.subOptions : [];
  const subOption =
    secondaryOptions.find((option) => option.label === selectedSub) ||
    secondaryOptions.find((option) => option.label === card?.defaultSub) ||
    secondaryOptions[0] ||
    null;
  const effectiveSelectedSub = subOption?.label || null;

  const tertiaryOptions = Array.isArray(subOption?.subSubOptions) ? subOption.subSubOptions : [];
  const subSubOption =
    tertiaryOptions.find((option) => option.label === selectedSubSub) ||
    tertiaryOptions[0] ||
    null;
  const effectiveSelectedSubSub = subSubOption?.label || null;

  const currentImage =
    subSubOption?.imageUrl ||
    subOption?.imageUrl ||
    mainOption?.imageUrl ||
    getCardImage(card);

  const currentDescription =
    (Array.isArray(subSubOption?.terms) && subSubOption.terms.length > 0
      ? subSubOption.terms.slice(0, 2).join(" • ")
      : "") ||
    (Array.isArray(subOption?.terms) && subOption.terms.length > 0
      ? subOption.terms.slice(0, 2).join(" • ")
      : "") ||
    (Array.isArray(mainOption?.terms) && mainOption.terms.length > 0
      ? mainOption.terms.slice(0, 2).join(" • ")
      : "") ||
    subSubOption?.offerText ||
    subOption?.offerText ||
    mainOption?.offerText ||
    getCardDescription(card);

  const currentPackagesIncludes =
    subSubOption?.packagesIncludes ||
    subOption?.packagesIncludes ||
    mainOption?.packagesIncludes ||
    card?.packagesIncludes ||
    "";

  const currentPrice = useMemo(() => {
    if (card?.simple) return Number(card?.base || 0);

    let total = Number(mainOption?.price || 0);

    if (subOption && !subOption?.subSubOptions) {
      total += Number(subOption?.price || 0);
    }

    if (subSubOption) {
      total += Number(subSubOption?.price || 0);
    }

    return total || Number(card?.base || 0);
  }, [card, mainOption, subOption, subSubOption]);

  const optionStartingPrice = (option) => {
    if (!option) return 0;
    if (Array.isArray(option.subOptions) && option.subOptions.length > 0) {
      const nestedPrices = option.subOptions.flatMap((child) => {
        if (Array.isArray(child.subSubOptions) && child.subSubOptions.length > 0) {
          return child.subSubOptions.map((leaf) => Number(option.price || 0) + Number(leaf.price || 0));
        }
        return [Number(option.price || 0) + Number(child.price || 0)];
      });

      return nestedPrices.length > 0 ? Math.min(...nestedPrices) : Number(option.price || 0);
    }

    return Number(option.price || 0);
  };

  const renderMenuBranch = () => {
    if (!Array.isArray(card?.options) || card.options.length === 0) return null;

    return (
      <div className="modern-menu-tree">
        {card.options.map((option) => {
          const isSelectedMain = effectiveSelectedMain === option.label;
          const hasChildren = Array.isArray(option.subOptions) && option.subOptions.length > 0;

          return (
            <div
              key={`${card.id}-${option.label}`}
              className={`modern-menu-group ${isSelectedMain ? "is-active" : ""}`}
            >
              <button
                type="button"
                className={`modern-menu-row modern-menu-row-main ${isSelectedMain ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedMain(option.label);

                  if (!hasChildren) {
                    setSelectedSub(null);
                    setSelectedSubSub(null);
                    return;
                  }

                  const firstChild = option.subOptions[0] || null;
                  setSelectedSub(firstChild?.label || null);
                  setSelectedSubSub(firstChild?.subSubOptions?.[0]?.label || null);
                }}
              >
                <span className="modern-menu-name">{option.label}</span>
                <span className="modern-menu-dots" />
                <span className="modern-menu-price">{formatCurrency(optionStartingPrice(option))}</span>
              </button>

              {isSelectedMain && hasChildren ? (
                <div className="modern-menu-children">
                  {option.subOptions.map((child) => {
                    const hasGrandChildren = Array.isArray(child.subSubOptions) && child.subSubOptions.length > 0;
                    const isSelectedSub = effectiveSelectedSub === child.label;

                    if (hasGrandChildren) {
                      return (
                        <div
                          key={`${card.id}-${option.label}-${child.label}`}
                          className={`modern-menu-subgroup ${isSelectedSub ? "is-active" : ""}`}
                        >
                          <button
                            type="button"
                            className={`modern-menu-subgroup-title ${isSelectedSub ? "is-active" : ""}`}
                            onClick={() => {
                              setSelectedSub(child.label);
                              setSelectedSubSub(child.subSubOptions[0]?.label || null);
                            }}
                          >
                            {child.label}
                          </button>

                          <div className="modern-menu-grandchildren">
                            {child.subSubOptions.map((leaf) => {
                              const isSelectedLeaf = isSelectedSub && effectiveSelectedSubSub === leaf.label;

                              return (
                                <button
                                  key={`${card.id}-${child.label}-${leaf.label}`}
                                  type="button"
                                  className={`modern-menu-row modern-menu-row-leaf ${isSelectedLeaf ? "is-active" : ""}`}
                                  onClick={() => {
                                    setSelectedSub(child.label);
                                    setSelectedSubSub(leaf.label);
                                  }}
                                >
                                  <span className="modern-menu-name">{leaf.label}</span>
                                  <span className="modern-menu-dots" />
                                  <span className="modern-menu-price">
                                    {formatCurrency(Number(option.price || 0) + Number(leaf.price || 0))}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`${card.id}-${option.label}-${child.label}`}
                        type="button"
                        className={`modern-menu-row modern-menu-row-child ${isSelectedSub ? "is-active" : ""}`}
                        onClick={() => {
                          setSelectedSub(child.label);
                          setSelectedSubSub(null);
                        }}
                      >
                        <span className="modern-menu-name">{child.label}</span>
                        <span className="modern-menu-dots" />
                        <span className="modern-menu-price">
                          {formatCurrency(Number(option.price || 0) + Number(child.price || 0))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <article className="modern-service-row">
      <div className="modern-service-media">
        {currentImage ? <img src={currentImage} alt={card.title} /> : <span>{card.title.charAt(0)}</span>}
      </div>
      <div className="modern-service-copy">
        <h3>{card.title}</h3>
        {currentDescription ? <p>{currentDescription}</p> : null}

        {!card?.simple && Array.isArray(card?.options) && card.options.length > 0 ? (
          renderMenuBranch()
        ) : null}

        {currentPackagesIncludes ? (
          <div className="modern-package-box">
            <strong>Package Includes</strong>
            <div className="modern-package-items">
              {String(currentPackagesIncludes)
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item, index) => (
                  <span key={`${card.id}-package-${index}`} className="modern-package-item">
                    {item}
                  </span>
                ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="modern-service-side">
        <strong>{formatCurrency(currentPrice)}</strong>
        <button type="button" onClick={onOpenMenu}>
          {card?.simple ? "Add" : "Customize"}
        </button>
      </div>
    </article>
  );
}

export default function ModernPreviewTemplate({
  vendorInfo,
  category,
  orderedCategories,
  sectionsWithHeading,
  cardsWithoutHeading,
  mergedHeroImages,
  heroTagline,
  heroDescription,
  heroButton1,
  heroButton2,
  onPrimaryAction,
  onOpenMenu,
  cartItems,
  cartTotal,
}) {
  const navItems = useMemo(() => {
    const webMenu = Array.isArray(category?.webMenu) ? category.webMenu : [];
    const mapped = webMenu
      .map((item) => {
        const normalized = String(item || "").trim().toLowerCase();
        if (!normalized) return null;

        if (normalized === "categories") return { label: item, href: "#services" };
        if (normalized === "about" || normalized === "why us") {
          return { label: item, href: "#our-story" };
        }
        if (normalized === "contact") return { label: item, href: "#contact" };
        return { label: item, href: `#${toAnchor(item)}` };
      })
      .filter(Boolean);

    return mapped.length > 0 ? mapped : DEFAULT_NAV;
  }, [category]);

  const heroImage = mergedHeroImages?.[0] || "";
  const trustSummary = vendorInfo?.trustSummary || vendorInfo?.trust || {};
  const statEntries = Object.entries(trustSummary).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    return !Array.isArray(value);
  });

  const serviceSections = useMemo(() => {
    const flatSections = [];

    (sectionsWithHeading || []).forEach((section) => {
      const normalized = String(section?.sectionName || "").trim().toLowerCase();
      if (normalized === "offers") return;

      flatSections.push({
        sectionName: section.sectionName,
        cards: Array.isArray(section.cards) ? section.cards : [],
      });
    });

    if (Array.isArray(cardsWithoutHeading) && cardsWithoutHeading.length > 0) {
      flatSections.unshift({
        sectionName: "Featured Services",
        cards: cardsWithoutHeading,
      });
    }

    return flatSections
      .map((section) => ({
        ...section,
        cards: section.cards
          .map((card, index) => ({
            ...card,
            id: card?.id || `${section.sectionName}-${index}`,
            title: card?.title || section.sectionName,
          }))
          .filter(isDisplayableCard),
      }))
      .filter((section) => section.cards.length > 0);
  }, [sectionsWithHeading, cardsWithoutHeading]);

  const offerCard = useMemo(() => getOfferCard(orderedCategories), [orderedCategories]);
  const featureCards = Array.isArray(category?.whyUs?.cards) ? category.whyUs.cards.filter(Boolean) : [];
  const about = category?.about || {};
  const locationAddress = vendorInfo?.location?.address || "Location not available";
  const businessHours = Array.isArray(vendorInfo?.businessHours)
    ? vendorInfo.businessHours
    : Array.isArray(vendorInfo?.hours)
      ? vendorInfo.hours
      : [];
  const phoneNumbers = [
    vendorInfo?.phone,
    ...(Array.isArray(vendorInfo?.secondaryPhones) ? vendorInfo.secondaryPhones : []),
  ].filter(Boolean);

  return (
    <div className="modern-template-shell">
      <header className="modern-header" id="home">
        <a className="modern-brand" href="#home">
          <span className="modern-brand-mark">
            {(vendorInfo?.businessName || category?.name || "B").charAt(0).toUpperCase()}
          </span>
          <span className="modern-brand-text">{vendorInfo?.businessName || "Business"}</span>
        </a>

        <nav className="modern-nav">
          {navItems.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <button type="button" className="modern-book-btn" onClick={onOpenMenu}>
          Book Appointment
        </button>
      </header>

      <section className="modern-hero">
        <div className="modern-hero-copy">
          <div className="modern-eyebrow">
            {(category?.name || "Preview").toUpperCase()}
          </div>
          <h1>{heroTagline}</h1>
          <p>{heroDescription}</p>

          <div className="modern-hero-actions">
            {heroButton1 ? (
              <button type="button" className="modern-primary-btn" onClick={onPrimaryAction}>
                {heroButton1}
              </button>
            ) : null}
            {heroButton2 ? (
              <button type="button" className="modern-secondary-btn" onClick={onOpenMenu}>
                {heroButton2}
              </button>
            ) : null}
          </div>

          <div className="modern-stats">
            {statEntries.slice(0, 3).map(([key, value]) => (
              <div key={key} className="modern-stat-card">
                <strong>{String(value)}</strong>
                <span>{key.replace(/([A-Z])/g, " $1").trim()}</span>
              </div>
            ))}
            <div className="modern-stat-card">
              <strong>
                {vendorInfo?.googlePlace?.rating ? `${vendorInfo.googlePlace.rating}` : "Top Rated"}
              </strong>
              <span>
                Google Rating
                {vendorInfo?.googlePlace?.userRatingsTotal
                  ? ` (${vendorInfo.googlePlace.userRatingsTotal})`
                  : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="modern-hero-visual">
          {heroImage ? <img src={heroImage} alt={heroTagline} /> : null}
          <div className="modern-hero-note">
            <p>
              &ldquo;
              {vendorInfo?.customFields?.freeText2?.trim() || "Crafted to reflect your brand and services."}
              &rdquo;
            </p>
            <span>{vendorInfo?.businessName || "Business"}</span>
          </div>
        </div>
      </section>

      {offerCard ? (
        <section className="modern-offer-banner">
          <div>
            <h2>{offerCard.title || "Current Offer"}</h2>
            <p>{offerCard.offerText || getCardDescription(offerCard)}</p>
          </div>
          <button type="button" className="modern-offer-btn" onClick={onOpenMenu}>
            Claim Offer
          </button>
        </section>
      ) : null}

      <section className="modern-services" id="services">
        <div className="modern-section-header">
          <span className="modern-section-kicker">Service Menu</span>
          <h2>The Service Menu</h2>
        </div>

        <div className="modern-service-tabs">
          {serviceSections.map((section) => (
            <a key={section.sectionName} href={`#section-${toAnchor(section.sectionName)}`}>
              {section.sectionName}
            </a>
          ))}
        </div>

        {serviceSections.map((section) => (
          <div
            key={section.sectionName}
            className="modern-service-section"
            id={`section-${toAnchor(section.sectionName)}`}
          >
            <div className="modern-service-heading">{section.sectionName}</div>
            <div className="modern-service-list">
              {section.cards.map((card) => (
                <ModernServiceRow key={card.id} card={card} onOpenMenu={onOpenMenu} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="modern-story" id="our-story">
        <div className="modern-story-gallery">
          {mergedHeroImages.slice(0, 3).map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className={`modern-story-image modern-story-image-${index + 1}`}>
              <img src={imageUrl} alt={`${vendorInfo?.businessName || "Business"} ${index + 1}`} />
            </div>
          ))}
        </div>

        <div className="modern-story-copy">
          <span className="modern-section-kicker">Our Story</span>
          <h2>{about?.heading || `Crafting confidence at ${vendorInfo?.businessName || "our studio"}`}</h2>
          <p>{about?.mainText || category?.whyUs?.subHeading || heroDescription}</p>

          <div className="modern-feature-list">
            {featureCards.slice(0, 4).map((card, index) => (
              <div key={card?._id || `${card?.title}-${index}`} className="modern-feature-item">
                <span className="modern-feature-badge">{index + 1}</span>
                <div>
                  <strong>{card?.title || "Why choose us"}</strong>
                  <p>{card?.description || "Built from your current category content."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-contact" id="contact">
        <div className="modern-contact-left">
          <span className="modern-section-kicker">Visit the Sanctuary</span>
          <h2>{vendorInfo?.businessName || "Reach us"}</h2>
          <p>{locationAddress}</p>

          <div className="modern-contact-list">
            {phoneNumbers.map((phone, index) => (
              <a key={`${phone}-${index}`} href={`tel:${phone}`}>
                {phone}
              </a>
            ))}
          </div>

          <div className="modern-hours-card">
            <h3>Business Hours</h3>
            {businessHours.length > 0 ? (
              <ul>
                {businessHours.map((item, index) => (
                  <li key={item?._id || `${item?.day}-${index}`}>
                    <span>{item?.day || "Day"}</span>
                    <span>{item?.hours || "Closed"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Business hours not available.</p>
            )}
          </div>
        </div>

        <div className="modern-contact-right">
          <div className="modern-contact-card">
            <h3>Quick Inquiry</h3>
            <div className="modern-input-grid">
              <input type="text" placeholder="Full Name" />
              <input type="text" placeholder="Phone" />
            </div>
            <select defaultValue="">
              <option value="" disabled>
                Service Interest
              </option>
              {serviceSections.map((section) => (
                <option key={section.sectionName} value={section.sectionName}>
                  {section.sectionName}
                </option>
              ))}
            </select>
            <textarea placeholder="How can we help?" rows={5} />
            <button type="button" className="modern-request-btn" onClick={onOpenMenu}>
              Request Call Back
            </button>
          </div>
        </div>
      </section>

      <footer className="modern-footer">
        <div className="modern-footer-brand">
          <span className="modern-brand-mark">
            {(vendorInfo?.businessName || category?.name || "B").charAt(0).toUpperCase()}
          </span>
          <span>{vendorInfo?.businessName || "Business"}</span>
        </div>

        <div className="modern-footer-links">
          {navItems.map((item) => (
            <a key={`${item.label}-footer`} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="modern-footer-copy">
          {cartItems.length > 0 ? `Cart: ${cartItems.length} item(s) • Rs ${cartTotal}` : "Crafted for excellence."}
        </div>
      </footer>
    </div>
  );
}
