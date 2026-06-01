"use client";

import { useEffect, useMemo, useState } from "react";
import "./NurseriesPreviewTemplate.css";

const DEFAULT_NAV = [
  { label: "Shop", href: "#services" },
  { label: "Collections", href: "#collections" },
  { label: "Visit Nursery", href: "#contact" },
  { label: "Contact", href: "#contact" },
];

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (amount <= 0) return "Contact for price";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function hasDisplayPrice(value) {
  return Number(value || 0) > 0;
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

function getCardImage(card) {
  if (card?.img) return card.img;

  if (Array.isArray(card?.options)) {
    for (const option of card.options) {
      if (option?.imageUrl) return option.imageUrl;

      if (Array.isArray(option?.subOptions)) {
        for (const subOption of option.subOptions) {
          if (subOption?.imageUrl) return subOption.imageUrl;

          if (Array.isArray(subOption?.subSubOptions)) {
            for (const leaf of subOption.subSubOptions) {
              if (leaf?.imageUrl) return leaf.imageUrl;
            }
          }
        }
      }
    }
  }

  return "";
}

function splitTextList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|,|•/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTermsSummary(terms) {
  return splitTextList(terms).slice(0, 2).join(" • ");
}

function isOffersLabel(value) {
  return String(value || "").trim().toLowerCase() === "offers";
}

function isOfferLikeCard(card, sectionName) {
  if (!card) return false;
  if (isOffersLabel(sectionName) || isOffersLabel(card.title)) return true;

  return (
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
    })
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

function buildFallbackHeroSummary({ categoryName, address }) {
  const place = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  if (categoryName && place) {
    return `Explore premium ${String(categoryName).toLowerCase()} collections from ${place}.`;
  }

  if (categoryName) {
    return `Browse healthy ${String(categoryName).toLowerCase()} collections for homes, gardens and gifting.`;
  }

  return "Explore curated plant and garden collections.";
}

function getRefinedHeroCopy({ heroDescription, categoryName, address }) {
  const cleaned = String(heroDescription || "").trim();
  if (cleaned) return cleaned;
  return buildFallbackHeroSummary({ categoryName, address });
}

function buildNurseryRows(card, sectionName) {
  const rows = [];
  const cardImage = getCardImage(card);

  if (!Array.isArray(card?.options) || card.options.length === 0) {
    rows.push({
      id: `${card.id}-default`,
      title: card?.title || sectionName,
      subtitle: "",
      summary: getTermsSummary(card?.terms),
      bulletPoints: splitTextList(card?.terms),
      packagesIncludes: splitTextList(card?.packagesIncludes),
      imageUrl: cardImage,
      price: Number(card?.base || 0),
      categoryPath: [sectionName, card?.title].filter(Boolean),
      cartKey: `${card.id}-default`,
      offerText: String(card?.offerText || "").trim(),
    });
    return rows;
  }

  card.options.forEach((option, optionIndex) => {
    const optionImage = option?.imageUrl || cardImage;
    const subOptions = Array.isArray(option?.subOptions) ? option.subOptions : [];

    if (subOptions.length === 0) {
      rows.push({
        id: `${card.id}-option-${optionIndex}`,
        title: option?.label || card?.title || sectionName,
        subtitle: card?.title && option?.label !== card.title ? card.title : "",
        summary: getTermsSummary(option?.terms || card?.terms),
        bulletPoints: splitTextList(option?.terms || card?.terms),
        packagesIncludes: splitTextList(option?.packagesIncludes || card?.packagesIncludes),
        imageUrl: optionImage,
        price: Number(option?.price || card?.base || 0),
        categoryPath: [sectionName, card?.title, option?.label].filter(Boolean),
        cartKey: `${card.id}-${option?.label || optionIndex}`,
        offerText: String(option?.offerText || card?.offerText || "").trim(),
      });
      return;
    }

    subOptions.forEach((subOption, subIndex) => {
      const subImage = subOption?.imageUrl || optionImage;
      const leafOptions = Array.isArray(subOption?.subSubOptions) ? subOption.subSubOptions : [];

      if (leafOptions.length === 0) {
        rows.push({
          id: `${card.id}-sub-${optionIndex}-${subIndex}`,
          title: subOption?.label || option?.label || card?.title || sectionName,
          subtitle: [card?.title, option?.label].filter(Boolean).join(" • "),
          summary: getTermsSummary(subOption?.terms || option?.terms || card?.terms),
          bulletPoints: splitTextList(subOption?.terms || option?.terms || card?.terms),
          packagesIncludes: splitTextList(
            subOption?.packagesIncludes || option?.packagesIncludes || card?.packagesIncludes
          ),
          imageUrl: subImage,
          price: Number(option?.price || 0) + Number(subOption?.price || 0),
          categoryPath: [sectionName, card?.title, option?.label, subOption?.label].filter(Boolean),
          cartKey: `${card.id}-${option?.label || optionIndex}-${subOption?.label || subIndex}`,
          offerText: String(subOption?.offerText || option?.offerText || card?.offerText || "").trim(),
        });
        return;
      }

      leafOptions.forEach((leaf, leafIndex) => {
        rows.push({
          id: `${card.id}-leaf-${optionIndex}-${subIndex}-${leafIndex}`,
          title: leaf?.label || subOption?.label || option?.label || card?.title || sectionName,
          subtitle: [card?.title, option?.label, subOption?.label].filter(Boolean).join(" • "),
          summary: getTermsSummary(leaf?.terms || subOption?.terms || option?.terms || card?.terms),
          bulletPoints: splitTextList(leaf?.terms || subOption?.terms || option?.terms || card?.terms),
          packagesIncludes: splitTextList(
            leaf?.packagesIncludes ||
              subOption?.packagesIncludes ||
              option?.packagesIncludes ||
              card?.packagesIncludes
          ),
          imageUrl: leaf?.imageUrl || subImage,
          price: Number(option?.price || 0) + Number(leaf?.price || 0),
          categoryPath: [sectionName, card?.title, option?.label, subOption?.label, leaf?.label].filter(Boolean),
          cartKey: `${card.id}-${option?.label || optionIndex}-${subOption?.label || subIndex}-${leaf?.label || leafIndex}`,
          offerText: String(
            leaf?.offerText || subOption?.offerText || option?.offerText || card?.offerText || ""
          ).trim(),
        });
      });
    });
  });

  return rows;
}

function NurseryProductCard({ row, cartItem, onAddToCart, onIncreaseQty, onDecreaseQty, viewMode }) {
  const handleAdd = () => {
    if (typeof onAddToCart !== "function") return;
    onAddToCart(
      {
        _id: row.cartKey,
        categoryId: row.cartKey,
        cartKey: row.cartKey,
        name: row.title,
        price: Number(row.price) || 0,
      },
      row.categoryPath,
      []
    );
  };

  return (
    <article className={`nursery-product-card ${viewMode === "list" ? "is-list" : ""}`}>
      <div className="nursery-product-media">
        {row.offerText ? <span className="nursery-sale-badge">{row.offerText}</span> : null}
        {row.imageUrl ? (
          <img src={row.imageUrl} alt={row.title} />
        ) : (
          <div className="nursery-product-placeholder">Preview</div>
        )}
      </div>
      <div className="nursery-product-body">
        <span className="nursery-product-stock">In stock</span>
        <h3>{row.title}</h3>
        {row.subtitle ? <p className="nursery-product-subtitle">{row.subtitle}</p> : null}
        {row.summary ? <p className="nursery-product-summary">{row.summary}</p> : null}
        <div className="nursery-product-footer">
          <span
            className={`nursery-product-price ${
              hasDisplayPrice(row.price) ? "" : "is-contact"
            }`}
          >
            {formatCurrency(row.price)}
          </span>
          {cartItem ? (
            <div className="nursery-qty-controls">
              <button type="button" onClick={() => onDecreaseQty?.(row.cartKey)}>-</button>
              <span>{cartItem.qty || 1}</span>
              <button type="button" onClick={() => onIncreaseQty?.(row.cartKey)}>+</button>
            </div>
          ) : (
            <button type="button" className="nursery-add-btn" onClick={handleAdd}>
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function NurseryCollectionCard({ collection, isActive, onClick }) {
  const images = Array.isArray(collection?.images) ? collection.images.filter(Boolean) : [];
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [collection?.id, images.length]);

  useEffect(() => {
    if (images.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % images.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [images]);

  const currentImage = images[imageIndex] || collection?.imageUrl || "";

  return (
    <button
      type="button"
      className={`nursery-collection-card ${isActive ? "is-active" : ""}`}
      onClick={onClick}
    >
      {currentImage ? (
        <div className="nursery-collection-image">
          <img src={currentImage} alt={collection.title} />
        </div>
      ) : null}
      <div className="nursery-collection-overlay">
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <span>View {collection.itemCount} items</span>
      </div>
    </button>
  );
}

export default function NurseriesPreviewTemplate({
  vendorInfo,
  category,
  orderedCategories,
  sectionsWithHeading,
  cardsWithoutHeading,
  mergedHeroImages,
  heroTagline,
  heroDescription,
  cartItems,
  cartTotal,
  onAddToCart,
  onIncreaseQty,
  onDecreaseQty,
  onOpenMenu,
}) {
  const [activeSectionName, setActiveSectionName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState("grid");

  const navItems = useMemo(() => {
    const webMenu = Array.isArray(category?.webMenu) ? category.webMenu : [];
    const mapped = webMenu
      .map((item) => {
        const normalized = String(item || "").trim().toLowerCase();
        if (!normalized) return null;
        if (normalized === "categories" || normalized === "services") return { label: item, href: "#services" };
        if (normalized === "gallery") return { label: item, href: "#collections" };
        if (normalized === "contact") return { label: item, href: "#contact" };
        return { label: item, href: `#${toAnchor(item)}` };
      })
      .filter(Boolean);
    return mapped.length > 0 ? mapped : DEFAULT_NAV;
  }, [category]);

  const serviceSections = useMemo(() => {
    const flatSections = [];

    (orderedCategories || []).forEach((section) => {
      const normalized = String(section?.sectionName || "").trim().toLowerCase();
      if (normalized === "offers") return;

      const filteredCards = (Array.isArray(section.cards) ? section.cards : [])
        .filter((card) => !isOfferLikeCard(card, section.sectionName))
        .map((card, index) => ({
          ...card,
          id: card?.id || `${section.sectionName}-${index}`,
          title: card?.title || section.sectionName,
        }))
        .filter(isDisplayableCard);

      if (filteredCards.length === 0) return;
      flatSections.push({ sectionName: section.sectionName, cards: filteredCards });
    });

    return flatSections;
  }, [orderedCategories]);

  useEffect(() => {
    if (!serviceSections.length) return;
    if (serviceSections.some((section) => section.sectionName === activeSectionName)) return;
    setActiveSectionName(serviceSections[0].sectionName);
  }, [activeSectionName, serviceSections]);

  const activeSection =
    serviceSections.find((section) => section.sectionName === activeSectionName) ||
    serviceSections[0] ||
    null;

  const activeRows = useMemo(() => {
    if (!activeSection) return [];
    const rows = activeSection.cards.flatMap((card) =>
      buildNurseryRows(card, activeSection.sectionName)
    );

    const filtered = rows.filter((row) => {
      const haystack = [row.title, row.subtitle, row.summary, ...(row.categoryPath || [])]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      return haystack.includes(String(searchValue || "").trim().toLowerCase());
    });

    const sorted = [...filtered];
    if (sortBy === "price_low") {
      sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_high") {
      sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }
    return sorted;
  }, [activeSection, searchValue, sortBy]);

  const collectionCards = useMemo(() => {
    return serviceSections.map((section) => {
      const rows = section.cards.flatMap((card) => buildNurseryRows(card, section.sectionName));
      const images = [
        ...new Set(
          [
            ...section.cards.map((card) => getCardImage(card)),
            ...rows.map((row) => row.imageUrl),
            mergedHeroImages?.[0] || "",
          ].filter(Boolean)
        ),
      ];
      const previewTitles = rows
        .slice(0, 2)
        .map((row) => row.title)
        .filter(Boolean);
      const remainingCount = Math.max(rows.length - previewTitles.length, 0);
      const titlePreview = [
        ...previewTitles,
        remainingCount > 0 ? `+${remainingCount} more` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      return {
        id: section.sectionName,
        title: section.sectionName,
        description: titlePreview || "Explore premium nursery collections.",
        imageUrl: images[0] || "",
        images,
        itemCount: rows.length,
      };
    });
  }, [mergedHeroImages, serviceSections]);

  const repeatedCollectionCards = collectionCards.length > 1 ? [...collectionCards, ...collectionCards] : collectionCards;
  const heroImage = mergedHeroImages?.[0] || collectionCards[0]?.imageUrl || "";
  const introSummary = getRefinedHeroCopy({
    heroDescription,
    categoryName: category?.name,
    address: vendorInfo?.location?.address,
  });

  const phoneNumbers = [
    vendorInfo?.phone,
    ...(Array.isArray(vendorInfo?.secondaryPhones) ? vendorInfo.secondaryPhones : []),
  ].filter(Boolean);

  const businessHours = Array.isArray(vendorInfo?.businessHours) ? vendorInfo.businessHours : [];
  const locationAddress = vendorInfo?.location?.address || "Location not available";
  const locationLat = vendorInfo?.location?.lat;
  const locationLng = vendorInfo?.location?.lng;
  const hasEmbeddedMap = Number.isFinite(Number(locationLat)) && Number.isFinite(Number(locationLng));
  const logoUrl = typeof vendorInfo?.logoUrl === "string" ? vendorInfo.logoUrl.trim() : "";

  const stats = [
    { label: "Collections", value: serviceSections.length || 0 },
    { label: "Products", value: activeRows.length || 0 },
    { label: "Delivery", value: "PAN India" },
    { label: "Support", value: phoneNumbers[0] ? "WhatsApp" : "Available" },
  ];

  return (
    <div className="nursery-template-shell">
      <header className="nursery-header" id="home">
        <div className="nursery-header-top">
          <button
            type="button"
            className={`nursery-mobile-toggle ${mobileMenuOpen ? "is-open" : ""}`}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <a className="nursery-brand" href="#home">
            {logoUrl ? (
              <img src={logoUrl} alt={`${vendorInfo?.businessName || "Nursery"} logo`} className="nursery-brand-logo" />
            ) : (
              <span className="nursery-brand-mark">
                {(vendorInfo?.businessName || category?.name || "N").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="nursery-brand-text">{vendorInfo?.businessName || "Nursery"}</span>
          </a>

          <div className="nursery-searchbar">
            <select
              value={activeSection?.sectionName || ""}
              onChange={(event) => {
                setActiveSectionName(event.target.value);
                scrollToElementById("services");
              }}
            >
              <option value="">All categories</option>
              {serviceSections.map((section) => (
                <option key={section.sectionName} value={section.sectionName}>
                  {section.sectionName}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="What are you looking for?"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <button type="button" onClick={() => scrollToElementById("services")}>
              Search
            </button>
          </div>

          <div className="nursery-header-actions">
            {phoneNumbers[0] ? <a href={`tel:${phoneNumbers[0]}`}>Call Now</a> : <span>Support</span>}
            <button type="button" onClick={() => scrollToElementById("contact")}>Login</button>
            <button type="button" onClick={onOpenMenu}>
              Cart {cartItems.length > 0 ? `(${cartItems.length})` : ""}
            </button>
          </div>
        </div>

        <nav className="nursery-nav" aria-label="Primary">
          {navItems.map((item) => (
            <a key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        {mobileMenuOpen ? (
          <div className="nursery-mobile-menu">
            {navItems.map((item) => (
              <a key={`${item.label}-mobile`} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      <section className="nursery-hero">
        <div className="nursery-hero-copy">
          <span className="nursery-kicker">{vendorInfo?.location?.address?.split(",")[0] || "Premium Nursery"}</span>
          <h1>{heroTagline || "Where Nature Blooms"}</h1>
          <p>{introSummary}</p>

          <div className="nursery-hero-actions">
            <button type="button" className="nursery-primary-btn" onClick={() => scrollToElementById("services")}>
              Shop All Plants
            </button>
            <button type="button" className="nursery-secondary-btn" onClick={() => scrollToElementById("collections")}>
              Explore Collections
            </button>
          </div>

          <div className="nursery-stats-grid">
            {stats.map((item) => (
              <div key={item.label} className="nursery-stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="nursery-hero-visual">
          {heroImage ? <img src={heroImage} alt={heroTagline || vendorInfo?.businessName || "Nursery preview"} /> : null}
        </div>
      </section>

      <section className="nursery-feature-strip">
        <div className="nursery-feature-item">
          <strong>Pan-India Support</strong>
          <span>Collections across categories</span>
        </div>
        <div className="nursery-feature-item">
          <strong>Healthy Stock</strong>
          <span>Fresh listings from your catalog</span>
        </div>
        <div className="nursery-feature-item">
          <strong>{phoneNumbers[0] ? "WhatsApp Support" : "Quick Support"}</strong>
          <span>{phoneNumbers[0] || "Responsive team"}</span>
        </div>
        <div className="nursery-feature-item">
          <strong>{businessHours.length > 0 ? "Open Weekly" : "Quick Enquiry"}</strong>
          <span>{businessHours[0]?.hours || "Available on request"}</span>
        </div>
      </section>

      {collectionCards.length > 0 ? (
        <section className="nursery-collections" id="collections">
          <div className="nursery-section-head">
            <h2>Explore by Category</h2>
            <p>Browse every collection as a dedicated box and jump straight into the products you need.</p>
          </div>

          <div className="nursery-collections-marquee">
            <div
              className={`nursery-collections-track ${
                collectionCards.length > 1 ? "is-animated" : ""
              }`}
            >
              {repeatedCollectionCards.map((collection, index) => (
                <NurseryCollectionCard
                  key={`${collection.id}-${index}`}
                  collection={collection}
                  isActive={activeSection?.sectionName === collection.title}
                  onClick={() => {
                    setActiveSectionName(collection.title);
                    scrollToElementById("services");
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="nursery-products" id="services">
        <div className="nursery-mobile-toolbar">
          <button type="button" onClick={() => setMobileFiltersOpen((current) => !current)}>
            Filters
          </button>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Sort by</option>
            <option value="name">Name</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
          <div className="nursery-view-toggle">
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")}>
              Grid
            </button>
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}>
              List
            </button>
          </div>
        </div>

        <div className="nursery-products-layout">
          <aside className={`nursery-sidebar ${mobileFiltersOpen ? "is-open" : ""}`}>
            <div className="nursery-sidebar-head">
              <h3>Filters</h3>
              <button type="button" className="nursery-sidebar-close" onClick={() => setMobileFiltersOpen(false)}>
                Close
              </button>
            </div>

            <div className="nursery-filter-group">
              <strong>Categories</strong>
              <div className="nursery-filter-list">
                {serviceSections.map((section) => {
                  const count = section.cards.flatMap((card) => buildNurseryRows(card, section.sectionName)).length;
                  const active = activeSection?.sectionName === section.sectionName;
                  return (
                    <button
                      key={section.sectionName}
                      type="button"
                      className={`nursery-filter-item ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setActiveSectionName(section.sectionName);
                        setMobileFiltersOpen(false);
                      }}
                    >
                      <span>{section.sectionName}</span>
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="nursery-products-main">
            <div className="nursery-products-topbar">
              <div>
                <h2>{activeSection?.sectionName || category?.name || "Nursery Collection"}</h2>
                <p>
                  {activeRows.length > 0
                    ? `Showing ${activeRows.length} curated items in this collection.`
                    : "No products found for this collection yet."}
                </p>
              </div>

              <div className="nursery-products-controls">
                <label>
                  Sort by
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="name">Name</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                </label>

                <div className="nursery-view-toggle desktop-only">
                  <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")}>
                    Grid
                  </button>
                  <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")}>
                    List
                  </button>
                </div>
              </div>
            </div>

            <div className={`nursery-product-grid ${viewMode === "list" ? "is-list" : ""}`}>
              {activeRows.map((row) => {
                const cartItem = cartItems.find((item) => (item.cartKey || item.itemId) === row.cartKey);
                return (
                  <NurseryProductCard
                    key={row.id}
                    row={row}
                    cartItem={cartItem}
                    viewMode={viewMode}
                    onAddToCart={onAddToCart}
                    onIncreaseQty={onIncreaseQty}
                    onDecreaseQty={onDecreaseQty}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="nursery-contact" id="contact">
        <div className="nursery-contact-copy">
          <span className="nursery-kicker">Visit Our Nursery</span>
          <h2>{vendorInfo?.businessName || "Visit Our Nursery"}</h2>
          <p>{introSummary}</p>

          <div className="nursery-contact-block">
            <strong>Address</strong>
            <span>{locationAddress}</span>
          </div>

          <div className="nursery-contact-block">
            <strong>Hours</strong>
            <span>
              {businessHours.length > 0
                ? businessHours.map((item) => `${item.day}: ${item.hours}`).join(" • ")
                : "Business hours not available"}
            </span>
          </div>

          {phoneNumbers.length > 0 ? (
            <div className="nursery-contact-phones">
              {phoneNumbers.map((phone, index) => (
                <a key={`${phone}-${index}`} href={`tel:${phone}`}>
                  {phone}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="nursery-contact-map">
          {hasEmbeddedMap ? (
            <iframe
              title="Business location map"
              width="100%"
              height="100%"
              loading="lazy"
              src={`https://www.google.com/maps?q=${locationLat},${locationLng}&z=15&output=embed`}
            />
          ) : (
            <div className="nursery-map-placeholder">Map preview unavailable</div>
          )}
        </div>
      </section>

      {cartItems.length > 0 ? (
        <div className="nursery-cart-bar">
          <div>
            <strong>{cartItems.length} item(s) selected</strong>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          <button type="button" onClick={onOpenMenu}>
            Open Cart
          </button>
        </div>
      ) : null}
    </div>
  );
}
