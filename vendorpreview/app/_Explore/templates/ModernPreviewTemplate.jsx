"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../config";
import "./ModernPreviewTemplate.css";

const DEFAULT_NAV = [
  { label: "Services", href: "#services" },
  { label: "Our Story", href: "#our-story" },
  { label: "Contact", href: "#contact" },
];

function getPoweredByUrl() {
  return (
    process.env.NEXT_PUBLIC_VENDOR_PREVIEW_ROOT_URL ||
    process.env.NEXT_PUBLIC_PREVIEW_BASE_URL ||
    "http://localhost:4000"
  )
    .trim()
    .replace(/\/$/, "");
}

function scrollToElementById(id) {
  if (typeof window === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return "Contact";
  return `₹${amount.toLocaleString("en-IN")}`;
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

function isOffersLabel(value) {
  return String(value || "").trim().toLowerCase() === "offers";
}

function isOfferLikeCard(card, sectionName) {
  if (!card) return false;
  if (isOffersLabel(sectionName)) return true;
  if (isOffersLabel(card.title)) return true;

  const hasOptionOffers =
    Array.isArray(card.options) &&
    card.options.some((option) => {
      const ownOffer = typeof option?.offerText === "string" && option.offerText.trim();
      const nestedOffer =
        Array.isArray(option?.subOptions) &&
        option.subOptions.some((subOption) => {
          const subOffer = typeof subOption?.offerText === "string" && subOption.offerText.trim();
          const deepOffer =
            Array.isArray(subOption?.subSubOptions) &&
            subOption.subSubOptions.some(
              (leaf) => typeof leaf?.offerText === "string" && leaf.offerText.trim()
            );
          return subOffer || deepOffer;
        });
      return ownOffer || nestedOffer;
    });

  return hasOptionOffers && isOffersLabel(card.title);
}

function flattenOfferCards(cards, sectionName) {
  return (cards || []).flatMap((card, cardIndex) => {
    if (!isOfferLikeCard(card, sectionName)) return [];

    const sourceLabel = !isOffersLabel(sectionName)
      ? sectionName
      : !isOffersLabel(card?.title)
        ? card.title
        : "";

    const normalizedCard = {
      ...card,
      id: card?.id || `offer-${cardIndex}`,
      title: card?.title || `Offer ${cardIndex + 1}`,
      sourceLabel,
    };

    if (Array.isArray(card?.options) && card.options.length > 0) {
      return card.options
        .map((option, optionIndex) => ({
          id: `${normalizedCard.id}-option-${optionIndex}`,
          title: option?.label || normalizedCard.title,
          offerText: option?.offerText || normalizedCard.offerText || "",
          terms: option?.terms || normalizedCard.terms || [],
          img: option?.imageUrl || normalizedCard.img || "",
          sourceLabel: normalizedCard.sourceLabel,
        }))
        .filter((offer) => {
          const hasText = typeof offer.offerText === "string" && offer.offerText.trim();
          const hasTerms = Array.isArray(offer.terms)
            ? offer.terms.length > 0
            : !!String(offer.terms || "").trim();
          return offer.title || hasText || hasTerms;
        });
    }

    const hasText =
      typeof normalizedCard.offerText === "string" && normalizedCard.offerText.trim();
    const hasTerms = Array.isArray(normalizedCard.terms)
      ? normalizedCard.terms.length > 0
      : !!String(normalizedCard.terms || "").trim();

    return normalizedCard.title || hasText || hasTerms ? [normalizedCard] : [];
  });
}

function getOfferCards(orderedCategories) {
  return (orderedCategories || []).flatMap((section) =>
    flattenOfferCards(section?.cards, section?.sectionName)
  );
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

function getTermsSummary(terms) {
  if (Array.isArray(terms) && terms.length > 0) {
    return terms.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 2).join(" • ");
  }

  if (typeof terms === "string" && terms.trim()) {
    return terms.trim();
  }

  return "";
}

function getPackageSummary(packagesIncludes) {
  return String(packagesIncludes || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" • ");
}

function renderPriceText(value, { startsFrom = false } = {}) {
  const formatted = formatCurrency(value);
  if (formatted === "Contact") return formatted;
  return startsFrom ? `Starts from ${formatted}` : formatted;
}

function prettifyLabel(key) {
  const normalized = String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.toLowerCase() === "experience years") {
    return "Years Experience";
  }

  return normalized;
}

function getStatAccent(label) {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("google rating")) return "star";
  if (normalized.includes("experience")) return "years";
  if (
    normalized.includes("stylist") ||
    normalized.includes("trainer") ||
    normalized.includes("team")
  ) {
    return "team";
  }
  if (normalized.includes("customer")) return "reach";
  return "info";
}

function splitHeroDescription(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return { lead: "", supporting: "" };

  const parts = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return { lead: normalized, supporting: "" };
  }

  return {
    lead: parts[0],
    supporting: parts.slice(1).join(" "),
  };
}

function buildFallbackHeroSummary({ categoryName, address }) {
  const place = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  if (categoryName && place) {
    return `Premium ${String(categoryName).toLowerCase()} services in ${place}.`;
  }

  if (categoryName) {
    return `Premium ${String(categoryName).toLowerCase()} services tailored for everyday care.`;
  }

  return "";
}

function stripDuplicateTrustPhrases(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return "";

  const cleaned = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const lower = part.toLowerCase();
      if (lower.includes("rated") && lower.includes("google")) return false;
      if (lower.includes("year") && lower.includes("experience")) return false;
      if (lower.includes("customer served")) return false;
      if (lower.includes("google rating")) return false;
      return true;
    })
    .join(" ");

  return cleaned || normalized;
}

function getRefinedHeroCopy({ heroDescription, categoryName, address }) {
  const stripped = stripDuplicateTrustPhrases(heroDescription);
  const fallback = buildFallbackHeroSummary({ categoryName, address });
  const source = stripped || fallback;
  return splitHeroDescription(source);
}

function getHeroHighlights({ vendorInfo, serviceModes, categoryName, serviceModeLabel }) {
  const highlights = [];
  const address = String(vendorInfo?.location?.address || "").trim();
  const addressParts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (categoryName) {
    highlights.push(`${categoryName} experiences tailored to your needs`);
  }

  if (serviceModes?.length) {
    const modeValue = serviceModes.join(" + ");
    const modeLabel = String(serviceModeLabel || "Service Type").trim();
    highlights.push(`${modeLabel}: ${modeValue}`);
  }

  if (addressParts.length > 0) {
    highlights.push(addressParts.slice(0, 2).join(", "));
  }

  if (typeof vendorInfo?.googlePlace?.rating === "number") {
    highlights.push(`Rated ${vendorInfo.googlePlace.rating}* on Google`);
  }

  return highlights.slice(0, 3);
}

function ModernServiceRow({ card, sectionName, onAddToCart }) {
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

  const hasHierarchy = Array.isArray(card?.options) && card.options.length > 0;
  const currentDescription = hasHierarchy ? "" : getCardDescription(card);

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

  const currentPackagesIncludes =
    (selectedSubSub ? subSubOption?.packagesIncludes : "") ||
    (selectedSub && !selectedSubSub ? subOption?.packagesIncludes : "") ||
    (!secondaryOptions.length ? mainOption?.packagesIncludes : "") ||
    card?.packagesIncludes ||
    "";

  let currentPrice = Number(card?.base || 0);

  if (card?.simple) {
    currentPrice = Number(card?.base || 0);
  } else if (!selectedMain) {
    currentPrice = Number(card?.base || 0);
  } else if (!selectedSub && mainOption) {
    currentPrice = optionStartingPrice(mainOption) || Number(card?.base || 0);
  } else {
    let total = Number(mainOption?.price || 0);

    if (subOption && !subOption?.subSubOptions) {
      total += Number(subOption?.price || 0);
    }

    if (subSubOption) {
      total += Number(subSubOption?.price || 0);
    }

    currentPrice = total || Number(card?.base || 0);
  }

  const handleAddSelected = () => {
    if (typeof onAddToCart !== "function") return;

    const categoryPath = [sectionName, selectedMain, selectedSub, selectedSubSub].filter(Boolean);
    const serviceId = card.id || card._id || card.categoryId || card.title;
    const serviceName = selectedSubSub || selectedSub || selectedMain || card.title;
    const cartKey = [serviceId, selectedMain, selectedSub, selectedSubSub].filter(Boolean).join("_");

    onAddToCart(
      {
        _id: serviceId,
        categoryId: serviceId,
        cartKey,
        name: serviceName,
        price: Number(currentPrice) || 0,
      },
      categoryPath,
      []
    );
  };

  const renderMenuText = (label, terms, packagesIncludes) => {
    const summary = getTermsSummary(terms);
    const packageSummary = getPackageSummary(packagesIncludes);

    return (
      <span className="modern-menu-copy">
        <span className="modern-menu-name">{label}</span>
        {summary ? <span className="modern-menu-terms">{summary}</span> : null}
        {packageSummary ? <span className="modern-menu-package-line">{packageSummary}</span> : null}
      </span>
    );
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

                  setSelectedSub(null);
                  setSelectedSubSub(null);
                }}
              >
                {renderMenuText(
                  option.label,
                  hasChildren ? null : option.terms,
                  hasChildren ? null : option.packagesIncludes
                )}
                <span className="modern-menu-dots" />
                <span className={`modern-menu-price ${hasChildren ? "is-starting" : ""}`}>
                  {renderPriceText(optionStartingPrice(option), { startsFrom: hasChildren })}
                </span>
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
                              setSelectedSubSub(null);
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
                                  {renderMenuText(leaf.label, leaf.terms, leaf.packagesIncludes)}
                                  <span className="modern-menu-dots" />
                                  <span className="modern-menu-price">
                                    {renderPriceText(Number(option.price || 0) + Number(leaf.price || 0))}
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
                        {renderMenuText(child.label, child.terms, child.packagesIncludes)}
                        <span className="modern-menu-dots" />
                        <span className="modern-menu-price">
                          {renderPriceText(Number(option.price || 0) + Number(child.price || 0))}
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
        {!hasHierarchy && currentPackagesIncludes ? (
          <div className="modern-inline-package-copy">
            {getPackageSummary(currentPackagesIncludes)}
          </div>
        ) : null}

        {!card?.simple && Array.isArray(card?.options) && card.options.length > 0 ? (
          renderMenuBranch()
        ) : null}

        <div className="modern-row-actions">
          <button type="button" className="modern-row-add-btn" onClick={handleAddSelected}>
            Add to Cart
          </button>
          <span className="modern-row-price">{formatCurrency(currentPrice)}</span>
        </div>
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
  vendorGalleryImages,
  heroTagline,
  heroDescription,
  onOpenMenu,
  cartItems,
  cartTotal,
  onAddToCart,
  onIncreaseQty,
  onDecreaseQty,
}) {
  const [serviceModeLabel, setServiceModeLabel] = useState("Service Modes");
  const [activeSectionName, setActiveSectionName] = useState("");
  const [activeCardId, setActiveCardId] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

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

  const heroCopy = useMemo(
    () =>
      getRefinedHeroCopy({
        heroDescription,
        categoryName: category?.name,
        address: vendorInfo?.location?.address,
      }),
    [category?.name, heroDescription, vendorInfo?.location?.address]
  );
  const trustSummary = vendorInfo?.trustSummary || vendorInfo?.trust || {};
  const trustEntries = Object.entries(trustSummary || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
  const trustCategoryId = vendorInfo?.categoryId || category?._id || category?.id;
  const serviceModeEntry = trustEntries.find(
    ([key, value]) =>
      Array.isArray(value) &&
      /(service|mode|delivery|format|type)/i.test(String(key))
  );
  const serviceModes = Array.isArray(serviceModeEntry?.[1])
    ? serviceModeEntry[1].map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const statEntries = Object.entries(trustSummary).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    return !Array.isArray(value);
  });
  const mapsLink = useMemo(() => {
    const googleMapsUrl = vendorInfo?.googlePlace?.mapsUrl;
    if (!googleMapsUrl) return "#";

    let placeId = "";
    if (googleMapsUrl.startsWith("place_id:")) {
      placeId = googleMapsUrl.replace("place_id:", "");
    } else if (googleMapsUrl.includes("place_id:")) {
      placeId = googleMapsUrl.split("place_id:")[1];
    }

    if (!placeId) return googleMapsUrl;

    const queryName = encodeURIComponent(heroTagline || vendorInfo?.businessName || "");
    return `https://www.google.com/maps/search/?api=1&query=${queryName}&query_place_id=${placeId}`;
  }, [heroTagline, vendorInfo?.businessName, vendorInfo?.googlePlace?.mapsUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrustQuestionMeta() {
      if (!trustCategoryId || !serviceModeEntry?.[0]) {
        if (!cancelled) {
          setServiceModeLabel("Service Modes");
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/trust/questions?categoryId=${encodeURIComponent(String(trustCategoryId))}`
        );
        const data = await response.json();
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        const matched = questions.find(
          (question) => String(question?.id || "").trim() === String(serviceModeEntry[0]).trim()
        );

        if (!cancelled) {
          setServiceModeLabel(String(matched?.label || serviceModeEntry[0] || "Service Modes"));
        }
      } catch {
        if (!cancelled) {
          setServiceModeLabel(String(serviceModeEntry?.[0] || "Service Modes"));
        }
      }
    }

    loadTrustQuestionMeta();

    return () => {
      cancelled = true;
    };
  }, [serviceModeEntry, trustCategoryId]);

  const serviceSections = useMemo(() => {
    const flatSections = [];

    (sectionsWithHeading || []).forEach((section) => {
      const normalized = String(section?.sectionName || "").trim().toLowerCase();
      if (normalized === "offers") return;

      const filteredCards = (Array.isArray(section.cards) ? section.cards : []).filter(
        (card) => !isOfferLikeCard(card, section.sectionName)
      );
      if (filteredCards.length === 0) return;

      flatSections.push({
        sectionName: section.sectionName,
        cards: filteredCards,
      });
    });

    if (Array.isArray(cardsWithoutHeading) && cardsWithoutHeading.length > 0) {
      const filteredStandaloneCards = cardsWithoutHeading.filter(
        (card) => !isOfferLikeCard(card, card?.title)
      );

      if (filteredStandaloneCards.length > 0) {
      flatSections.unshift({
        sectionName: "Featured Services",
        cards: filteredStandaloneCards,
      });
      }
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

  const rotatingGalleryImages = useMemo(() => {
    const serviceImages = [];

    serviceSections.forEach((section) => {
      (section.cards || []).forEach((card) => {
        const imageUrl = getCardImage(card);
        if (imageUrl) serviceImages.push(imageUrl);
      });
    });

    const galleryImages = Array.isArray(vendorGalleryImages)
      ? vendorGalleryImages.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const fallbackImages = Array.isArray(mergedHeroImages)
      ? mergedHeroImages.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const preferredPool = [...new Set([...serviceImages, ...galleryImages])];
    return preferredPool.length > 0 ? preferredPool : [...new Set(fallbackImages)];
  }, [mergedHeroImages, serviceSections, vendorGalleryImages]);

  useEffect(() => {
    if (rotatingGalleryImages.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      setGalleryStartIndex((prev) => (prev + 1) % rotatingGalleryImages.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [rotatingGalleryImages]);

  const rotatingGalleryWindow = useMemo(() => {
    if (rotatingGalleryImages.length === 0) return [];

    const count = Math.min(4, rotatingGalleryImages.length);
    return Array.from({ length: count }, (_, index) => {
      const imageIndex = (galleryStartIndex + index) % rotatingGalleryImages.length;
      return rotatingGalleryImages[imageIndex];
    });
  }, [galleryStartIndex, rotatingGalleryImages]);

  const heroImage = rotatingGalleryWindow[0] || "";
  const storyImages = rotatingGalleryWindow.slice(1);

  const offerCards = useMemo(() => getOfferCards(orderedCategories), [orderedCategories]);
  const featureCards = Array.isArray(category?.whyUs?.cards) ? category.whyUs.cards.filter(Boolean) : [];
  const about = category?.about || {};
  const locationAddress = vendorInfo?.location?.address || "Location not available";
  const businessHours = Array.isArray(vendorInfo?.businessHours)
    ? vendorInfo.businessHours
    : Array.isArray(vendorInfo?.hours)
      ? vendorInfo.hours
      : [];
  const locationLat = Number(vendorInfo?.location?.lat);
  const locationLng = Number(vendorInfo?.location?.lng);
  const hasEmbeddedMap = Number.isFinite(locationLat) && Number.isFinite(locationLng);
  const phoneNumbers = [
    vendorInfo?.phone,
    ...(Array.isArray(vendorInfo?.secondaryPhones) ? vendorInfo.secondaryPhones : []),
  ].filter(Boolean);
  const poweredByUrl = getPoweredByUrl();
  const heroHighlights = getHeroHighlights({
    vendorInfo,
    serviceModes,
    categoryName: category?.name,
    serviceModeLabel,
  });
  const activeSection =
    serviceSections.find((section) => section.sectionName === activeSectionName) ||
    serviceSections[0] ||
    null;
  const activeCard =
    activeSection?.cards?.find((card) => card.id === activeCardId) ||
    activeSection?.cards?.[0] ||
    null;

  const goToQuickInquiry = () => {
    scrollToElementById("quick-inquiry");
  };

  return (
    <div className="modern-template-shell">
      <header className="modern-header" id="home">
        <a className="modern-brand" href="#home">
          <span className="modern-brand-mark">
            {(vendorInfo?.businessName || category?.name || "B").charAt(0).toUpperCase()}
          </span>
          <span className="modern-brand-text">{vendorInfo?.businessName || "Business"}</span>
        </a>

        <nav className="modern-nav" aria-label="Primary">
          {navItems.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <button type="button" className="modern-book-btn" onClick={goToQuickInquiry}>
          Book Appointment
        </button>

        <button
          type="button"
          className={`modern-mobile-menu-toggle ${mobileMenuOpen ? "is-open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="modern-mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id="modern-mobile-menu"
          className={`modern-mobile-menu ${mobileMenuOpen ? "is-open" : ""}`}
        >
          <nav className="modern-mobile-menu-links" aria-label="Mobile">
            {navItems.map((item) => (
              <a
                key={`mobile-${item.label}-${item.href}`}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="modern-mobile-menu-book"
            onClick={() => {
              setMobileMenuOpen(false);
              goToQuickInquiry();
            }}
          >
            Book Appointment
          </button>
        </div>
      </header>

      <section className="modern-hero">
        <div className="modern-hero-copy">
          <div className="modern-eyebrow">
            {(category?.name || "Preview").toUpperCase()}
          </div>
          <h1>{heroTagline}</h1>
          <div className="modern-hero-description">
            {heroCopy.lead ? <p className="modern-hero-lead">{heroCopy.lead}</p> : null}
            {heroCopy.supporting ? (
              <p className="modern-hero-supporting">{heroCopy.supporting}</p>
            ) : null}
          </div>

          <div className="modern-stats">
            {statEntries.slice(0, 3).map(([key, value]) => {
              const label = prettifyLabel(key);

              return (
                <div key={key} className="modern-stat-card">
                  <span className={`modern-stat-accent is-${getStatAccent(label)}`} aria-hidden="true" />
                  <strong>{String(value)}</strong>
                  <span className="modern-stat-label">{label}</span>
                </div>
              );
            })}
            {typeof vendorInfo?.googlePlace?.rating === "number" ? (
              <a
                className="modern-stat-card modern-stat-card-link"
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="modern-stat-accent is-star" aria-hidden="true" />
                <strong>{vendorInfo.googlePlace.rating}*</strong>
                <span className="modern-stat-label">
                  Google Rating
                  {vendorInfo?.googlePlace?.userRatingsTotal
                    ? ` (${vendorInfo.googlePlace.userRatingsTotal})`
                    : ""}
                </span>
                <span className="modern-stat-link-hint">Google profile</span>
              </a>
            ) : (
              <div className="modern-stat-card">
                <span className="modern-stat-accent is-info" aria-hidden="true" />
                <strong>Top Rated</strong>
                <span className="modern-stat-label">Quality Service</span>
              </div>
            )}
          </div>

        </div>

        <div className="modern-hero-visual">
          {heroImage ? <img src={heroImage} alt={heroTagline} /> : null}
          <div className="modern-hero-note">
            <div className="modern-hero-note-kicker">Quick Highlights</div>
            <div className="modern-hero-note-title">{vendorInfo?.businessName || "Business"}</div>
            <ul className="modern-hero-note-list">
              {heroHighlights.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {offerCards.length > 0 ? (
        <section className="modern-offers" id="offers">
          <div className="modern-offers-header">
            <div>
              <span className="modern-section-kicker">Offers</span>
              <h2>Current Offers</h2>
            </div>
          </div>

          <div className="modern-offers-track">
            {offerCards.map((offer) => {
              const offerTerms = Array.isArray(offer.terms)
                ? offer.terms.map((item) => String(item || "").trim()).filter(Boolean)
                : String(offer.terms || "")
                    .split(/\r?\n|,/)
                    .map((item) => item.trim())
                    .filter(Boolean);

              const offerImage = getCardImage(offer);

              return (
                <article key={offer.id} className="modern-offer-card">
                  {offerImage ? (
                    <div className="modern-offer-card-image">
                      <img src={offerImage} alt={offer.title} />
                    </div>
                  ) : null}

                  <div className="modern-offer-card-body">
                    <h3>{offer.title}</h3>

                    {offer.offerText ? (
                      <div className="modern-offer-card-copy">
                        <p>{offer.offerText}</p>
                      </div>
                    ) : null}

                    {offerTerms.length > 0 ? (
                      <div className="modern-offer-card-terms">
                        {offerTerms.map((term, index) => (
                          <span key={`${offer.id}-term-${index}`} className="modern-offer-term">
                            {term}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="modern-services" id="services">
        <div className="modern-section-header">
          <span className="modern-section-kicker">Service Menu</span>
          <h2>The Service Menu</h2>
        </div>

        <div className="modern-service-tabs">
          {serviceSections.map((section) => (
            <button
              key={section.sectionName}
              type="button"
              className={`modern-service-tab ${activeSection?.sectionName === section.sectionName ? "is-active" : ""}`}
              onClick={() => setActiveSectionName(section.sectionName)}
            >
              {section.sectionName}
              {section.cards.length > 0 ? (
                <span className="modern-service-tab-count">{section.cards.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {activeSection ? (
          <div
            key={activeSection.sectionName}
            className="modern-service-section"
            id={`section-${toAnchor(activeSection.sectionName)}`}
          >
            <div className="modern-service-heading">{activeSection.sectionName}</div>

            {activeSection.cards.length > 1 ? (
              <div className="modern-card-switcher" aria-label={`${activeSection.sectionName} services`}>
                {activeSection.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`modern-card-switcher-btn ${activeCard?.id === card.id ? "is-active" : ""}`}
                    onClick={() => setActiveCardId(card.id)}
                  >
                    <span className="modern-card-switcher-title">{card.title}</span>
                    {card.base ? (
                      <span className="modern-card-switcher-meta">
                        {Array.isArray(card.options) && card.options.length > 0
                          ? renderPriceText(card.base, { startsFrom: true })
                          : formatCurrency(card.base)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {activeCard ? (
              <div className="modern-service-list">
                <ModernServiceRow
                  key={activeCard.id}
                  card={activeCard}
                  sectionName={activeSection.sectionName}
                  onAddToCart={onAddToCart}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {cartItems.length > 0 ? (
        <div className="modern-cart-bar">
          <div className="modern-cart-bar-copy">
            <strong>{cartItems.length} item(s) in cart</strong>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          <div className="modern-cart-bar-items">
            {cartItems.slice(0, 3).map((item, index) => (
              <div key={`${item.cartKey || item.itemId}-${index}`} className="modern-cart-pill">
                <span>{item.name}</span>
                <div className="modern-cart-pill-controls">
                  <button type="button" onClick={() => onDecreaseQty?.(item.cartKey || item.itemId)}>-</button>
                  <span>{item.qty}</span>
                  <button type="button" onClick={() => onIncreaseQty?.(item.cartKey || item.itemId)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="modern-cart-bar-btn" onClick={onOpenMenu}>
            Open Cart
          </button>
        </div>
      ) : null}

      <section className="modern-story" id="our-story">
        <div className="modern-story-gallery">
          {storyImages.map((imageUrl, index) => (
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

          {hasEmbeddedMap ? (
            <div className="modern-hours-card modern-map-card">
              <h3>Location Map</h3>
              <div className="modern-map-frame">
                <iframe
                  title="Business location map"
                  width="100%"
                  height="240"
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${locationLat},${locationLng}&z=15&output=embed`}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="modern-contact-right">
          <div className="modern-contact-card" id="quick-inquiry">
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
            <button type="button" className="modern-request-btn" onClick={goToQuickInquiry}>
              Coming Soon
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
          {cartItems.length > 0 ? `Cart: ${cartItems.length} item(s) • Rs ${cartTotal}` : ""}
        </div>

        <a
          className="modern-footer-powered"
          href={poweredByUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img src="/favicon.svg" alt="Ynot" className="modern-footer-powered-logo" />
          <span>Powered by Ynot</span>
        </a>
      </footer>
    </div>
  );
}
