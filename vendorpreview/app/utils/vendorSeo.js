export function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function uniqueStrings(values = []) {
  const seen = new Set();
  return values
    .map((value) => cleanText(value))
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSocialKey(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getSocialHref(key, value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (key === "email") return `mailto:${value}`;
  if (key === "whatsapp") {
    const digits = String(value).replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  return `https://${key}.com/${String(value).replace(/^@/, "")}`;
}

export function getVendorDisplayName(vendor) {
  return cleanText(
    vendor?.businessName ||
      vendor?.contactName ||
      vendor?.vendorName ||
      vendor?.name ||
      "Business"
  );
}

export function getVendorCategoryName(vendor) {
  return cleanText(
    vendor?.categoryData?.name ||
      vendor?.category?.name ||
      vendor?.categoryName ||
      vendor?.previewSeoData?.categoryName ||
      ""
  );
}

export function getVendorLocationSummary(vendor) {
  const primaryLocality = cleanText(vendor?.serviceAreas?.primaryLocality);
  const city = cleanText(vendor?.serviceAreas?.city);
  const targetAreas = uniqueStrings(vendor?.serviceAreas?.targetAreas || vendor?.targetedLocations || []);
  const address = cleanText(vendor?.location?.address);

  return {
    primaryLocality,
    city,
    targetAreas,
    address,
  };
}

export function getVendorPhoneNumbers(vendor) {
  return uniqueStrings([
    vendor?.phone,
    ...(Array.isArray(vendor?.secondaryPhones) ? vendor.secondaryPhones : []),
  ]);
}

export function getVendorSocialEntries(vendor) {
  const links = vendor?.socialLinks && typeof vendor.socialLinks === "object" ? vendor.socialLinks : {};

  const mapped = Object.entries(links)
    .map(([key, rawValue]) => {
      const normalizedKey = normalizeSocialKey(key);
      const value = cleanText(rawValue);
      const href = getSocialHref(normalizedKey, value);
      if (!normalizedKey || !value || !href) return null;
      return { key: normalizedKey, value, href };
    })
    .filter(Boolean);

  const phone = getVendorPhoneNumbers(vendor)[0];
  if (phone && !mapped.some((entry) => entry.key === "whatsapp")) {
    mapped.push({
      key: "whatsapp",
      value: phone,
      href: getSocialHref("whatsapp", phone),
    });
  }

  return mapped;
}

export function getVendorPrimaryImage(vendor) {
  return cleanText(
    vendor?.logoUrl ||
      (Array.isArray(vendor?.profilePictures) ? vendor.profilePictures.find(Boolean) : "") ||
      ""
  );
}

const LOW_SIGNAL_SERVICE_NAMES = new Set([
  "basic",
  "standard",
  "premium",
  "luxury",
  "hd",
  "airbrush",
  "test",
  "trial",
  "trail",
  "groom",
  "package",
  "packages",
  "offer",
  "offers",
  "menu",
  "service",
  "services",
  "product",
  "products",
]);

function isLowSignalServiceName(value) {
  const normalized = cleanText(value).toLowerCase();
  return LOW_SIGNAL_SERVICE_NAMES.has(normalized);
}

function sanitizePhraseParts(value) {
  return String(value || "")
    .split(/\s+/)
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function normalizeSeoPhrase(value) {
  const parts = sanitizePhraseParts(value);
  const genericRoots = new Set([
    "package",
    "packages",
    "offer",
    "offers",
    "service",
    "services",
    "product",
    "products",
    "menu",
  ]);
  const unique = [];
  const seen = new Set();

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const key = part.toLowerCase();
    if (index === 0 && parts.length > 1 && genericRoots.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return cleanText(unique.join(" "));
}

function scoreServiceName(value, source) {
  const normalized = normalizeSeoPhrase(value);
  const lower = normalized.toLowerCase();
  let score = 0;

  if (!normalized) return 0;

  if (source === "phrase") score += 160;
  if (source === "group") score += 120;
  if (source === "section") score += 90;
  if (source === "item") score += 40;

  if (/\b(package|packages|bridal|makeup|facial|styling|rental|taxi|cab|ghee|cashew|dry fruit|jelli|jellies|service|services|product|products|boarding|grooming|dressings|dressing|nursing|medical|care|pet)\b/i.test(normalized)) {
    score += 40;
  }

  if (normalized.split(/\s+/).length >= 2) score += 25;
  if (normalized.length >= 12) score += 10;
  if (isLowSignalServiceName(lower)) score -= 120;

  return score;
}

export function getVendorServiceNames(vendor) {
  const fromPhrases = Array.isArray(vendor?.previewSeoData?.phraseNames)
    ? vendor.previewSeoData.phraseNames
    : [];
  const fromGroups = Array.isArray(vendor?.previewSeoData?.groupNames)
    ? vendor.previewSeoData.groupNames
    : [];
  const fromPreviewSeo = Array.isArray(vendor?.previewSeoData?.itemNames)
    ? vendor.previewSeoData.itemNames
    : [];
  const fromSections = Array.isArray(vendor?.previewSeoData?.sectionTitles)
    ? vendor.previewSeoData.sectionTitles
    : [];

  const scoredCandidates = [
    ...fromPhrases.map((value) => ({ value, source: "phrase" })),
    ...fromGroups.map((value) => ({ value, source: "group" })),
    ...fromSections.map((value) => ({ value, source: "section" })),
    ...fromPreviewSeo.map((value) => ({ value, source: "item" })),
  ]
    .map(({ value, source }) => ({
      value: normalizeSeoPhrase(value),
      source,
      score: scoreServiceName(normalizeSeoPhrase(value), source),
    }))
    .filter(({ value, score }) => value && score > 0)
    .sort((a, b) => b.score - a.score);

  const sourceBuckets = {
    group: [],
    phrase: [],
    section: [],
    item: [],
  };

  scoredCandidates.forEach((candidate) => {
    const bucket = sourceBuckets[candidate.source];
    if (Array.isArray(bucket)) {
      bucket.push(candidate);
    }
  });

  const selected = [];
  const seen = new Set();

  const pushCandidate = (candidate) => {
    if (!candidate?.value) return false;
    const key = candidate.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    selected.push(candidate.value);
    return true;
  };

  const consumeBucket = (bucket, limit) => {
    let added = 0;
    for (const candidate of bucket) {
      if (added >= limit || selected.length >= 12) break;
      if (pushCandidate(candidate)) {
        added += 1;
      }
    }
  };

  // Start with meaningful parent groups so important buckets like
  // "Boarding" or "Dressings" are not crowded out by many child combinations.
  consumeBucket(sourceBuckets.group, 4);
  consumeBucket(sourceBuckets.phrase, 5);
  consumeBucket(sourceBuckets.section, 2);
  consumeBucket(sourceBuckets.item, 1);

  for (const candidate of scoredCandidates) {
    if (selected.length >= 12) break;
    pushCandidate(candidate);
  }

  return selected;
}

export function buildVendorTitle(vendor) {
  const name = getVendorDisplayName(vendor);
  const categoryName = getVendorCategoryName(vendor);
  const { primaryLocality, city } = getVendorLocationSummary(vendor);
  const locationLabel = cleanText([primaryLocality, city].filter(Boolean).join(", "));

  if (categoryName && locationLabel) return `${name} | ${categoryName} in ${locationLabel}`;
  if (categoryName) return `${name} | ${categoryName}`;
  if (locationLabel) return `${name} in ${locationLabel}`;
  return name;
}

export function buildVendorDescription(vendor) {
  const name = getVendorDisplayName(vendor);
  const categoryName = getVendorCategoryName(vendor);
  const { primaryLocality, city, targetAreas } = getVendorLocationSummary(vendor);
  const services = getVendorServiceNames(vendor).slice(0, 5);
  const rating = Number(vendor?.googlePlace?.rating || 0);
  const hasRating = Number.isFinite(rating) && rating > 0;

  const introParts = [];
  if (categoryName) {
    introParts.push(`${name} is a ${categoryName.toLowerCase()} business`);
  } else {
    introParts.push(`${name} offers local services and products`);
  }

  const locationBits = [primaryLocality, city].filter(Boolean);
  if (locationBits.length > 0) {
    introParts.push(`in ${locationBits.join(", ")}`);
  }

  let description = cleanText(introParts.join(" "));

  if (services.length > 0) {
    description += `. Popular offerings include ${services.join(", ")}`;
  }

  if (targetAreas.length > 0) {
    description += `. Serving ${targetAreas.slice(0, 5).join(", ")}`;
  }

  if (hasRating) {
    description += `. Rated ${rating} on Google`;
  }

  return cleanText(description) || `${name} vendor preview`;
}

function mapDayToSchema(day) {
  const normalized = cleanText(day).toLowerCase();
  const dayMap = {
    monday: "https://schema.org/Monday",
    tuesday: "https://schema.org/Tuesday",
    wednesday: "https://schema.org/Wednesday",
    thursday: "https://schema.org/Thursday",
    friday: "https://schema.org/Friday",
    saturday: "https://schema.org/Saturday",
    sunday: "https://schema.org/Sunday",
  };
  return dayMap[normalized] || "";
}

function to24HourTime(value) {
  const input = cleanText(value).toUpperCase();
  const match = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = match[2] || "00";
  const suffix = match[3];

  if (suffix === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function buildOpeningHoursSpecification(vendor) {
  const businessHours = Array.isArray(vendor?.businessHours)
    ? vendor.businessHours
    : Array.isArray(vendor?.hours)
      ? vendor.hours
      : [];

  return businessHours
    .map((entry) => {
      const dayOfWeek = mapDayToSchema(entry?.day);
      const normalizedHours = cleanText(entry?.hours).replace(/[–—]/g, "-");
      if (!dayOfWeek || !normalizedHours || /closed/i.test(normalizedHours)) return null;

      const parts = normalizedHours.split("-").map((part) => cleanText(part));
      if (parts.length !== 2) return null;

      const opens = to24HourTime(parts[0]);
      const closes = to24HourTime(parts[1]);
      if (!opens || !closes) return null;

      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens,
        closes,
      };
    })
    .filter(Boolean);
}

function getVendorSchemaType(vendor) {
  const templateKey = cleanText(vendor?.selectedTemplateKey).toLowerCase();
  if (templateKey === "ecommerce") return "Store";
  return "LocalBusiness";
}

export function buildVendorSchema(vendor, pageUrl) {
  if (!vendor) return null;

  const name = getVendorDisplayName(vendor);
  const { address, primaryLocality, city, targetAreas } = getVendorLocationSummary(vendor);
  const phoneNumbers = getVendorPhoneNumbers(vendor);
  const openingHoursSpecification = buildOpeningHoursSpecification(vendor);
  const socialEntries = getVendorSocialEntries(vendor);
  const image = getVendorPrimaryImage(vendor);
  const lat = Number(vendor?.location?.lat);
  const lng = Number(vendor?.location?.lng);
  const rating = Number(vendor?.googlePlace?.rating || 0);
  const ratingCount = Number(vendor?.googlePlace?.userRatingsTotal || 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": getVendorSchemaType(vendor),
    name,
    url: pageUrl || undefined,
    image: image || undefined,
    telephone: phoneNumbers[0] || undefined,
    email: cleanText(vendor?.email) || undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: primaryLocality || city || undefined,
          addressRegion: city || undefined,
          addressCountry: "IN",
        }
      : undefined,
    geo:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            "@type": "GeoCoordinates",
            latitude: lat,
            longitude: lng,
          }
        : undefined,
    sameAs: socialEntries.length > 0 ? socialEntries.map((entry) => entry.href) : undefined,
    areaServed:
      uniqueStrings([primaryLocality, city, ...targetAreas]).length > 0
        ? uniqueStrings([primaryLocality, city, ...targetAreas]).map((area) => ({
            "@type": "Place",
            name: area,
          }))
        : undefined,
    openingHoursSpecification:
      openingHoursSpecification.length > 0 ? openingHoursSpecification : undefined,
    aggregateRating:
      Number.isFinite(rating) && rating > 0 && Number.isFinite(ratingCount) && ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: ratingCount,
          }
        : undefined,
  };

  return Object.fromEntries(
    Object.entries(schema).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function buildVendorSeoSectionModel(vendor) {
  const name = getVendorDisplayName(vendor);
  const categoryName = getVendorCategoryName(vendor);
  const { primaryLocality, city, targetAreas } = getVendorLocationSummary(vendor);
  const serviceNames = getVendorServiceNames(vendor);
  const audienceAreas = uniqueStrings([primaryLocality, city, ...targetAreas]).slice(0, 8);

  return {
    businessName: name,
    categoryName,
    primaryLocality,
    city,
    serviceNames,
    audienceAreas,
    intro: buildVendorDescription(vendor),
    heading:
      categoryName && (primaryLocality || city)
        ? `${categoryName} in ${primaryLocality || city}`
        : categoryName || `About ${name}`,
  };
}
