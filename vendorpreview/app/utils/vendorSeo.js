export function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeClone(value) {
  if (typeof globalThis !== "undefined" && typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) {
      return value.map((item) => safeClone(item));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [key, safeClone(entryValue)])
      );
    }

    return value;
  }
}

function getNodeLabel(node) {
  return cleanText(node?.displayName || node?.title || node?.name || node?.label || "");
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

function normalizeMenuNodes(nodes) {
  if (Array.isArray(nodes)) return nodes;
  if (nodes && typeof nodes === "object") return [nodes];
  return [];
}

function buildNameMapFromTree(nodes) {
  const map = {};

  function walk(node) {
    if (node?.id && node?.name) {
      map[node.id] = cleanText(node.name);
    }
    node?.children?.forEach(walk);
  }

  normalizeMenuNodes(nodes).forEach(walk);
  return map;
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
    const normalized =
      digits.length === 10
        ? `91${digits}`
        : digits.length === 11 && digits.startsWith("0")
        ? `91${digits.slice(1)}`
        : digits;
    return normalized ? `https://wa.me/${normalized}` : "";
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

function buildSectionSeoPhrase(parts) {
  const rawParts = Array.isArray(parts)
    ? parts
        .map((part) => cleanText(part))
        .filter(Boolean)
    : [];

  if (rawParts.length === 0) return "";

  const genericRoots = new Set([
    "packages",
    "package",
    "offers",
    "offer",
    "services",
    "service",
    "products",
    "product",
    "menu",
  ]);

  const deduped = [];
  const seen = new Set();

  rawParts.forEach((part, index) => {
    const normalized = part.toLowerCase();
    if (index === 0 && rawParts.length > 1 && genericRoots.has(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(part);
  });

  return deduped.join(" ");
}

function collectPreviewSeoItemNames(nodes, names = []) {
  normalizeMenuNodes(nodes).forEach((node) => {
    if (!node || typeof node !== "object") return;

    if (node.isLeaf) {
      const itemName = getNodeLabel(node);
      if (itemName) names.push(itemName);
      return;
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      collectPreviewSeoItemNames(node.children, names);
    }
  });

  return names;
}

function collectPreviewSeoGroupNames(nodes, names = []) {
  normalizeMenuNodes(nodes).forEach((node) => {
    if (!node || typeof node !== "object") return;

    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length > 0) {
      const groupName = getNodeLabel(node);
      if (groupName) names.push(groupName);
      collectPreviewSeoGroupNames(children, names);
    }
  });

  return names;
}

function collectPreviewSeoPathPhrases(nodes, phrases = [], ancestors = []) {
  normalizeMenuNodes(nodes).forEach((node) => {
    if (!node || typeof node !== "object") return;

    const label = getNodeLabel(node);
    const nextAncestors = label ? [...ancestors, label] : ancestors;
    const children = Array.isArray(node.children) ? node.children : [];

    if (node.isLeaf) {
      const phrase = buildSectionSeoPhrase(nextAncestors);
      if (phrase) phrases.push(phrase);
      return;
    }

    if (children.length > 0) {
      collectPreviewSeoPathPhrases(children, phrases, nextAncestors);
    }
  });

  return phrases;
}

function collectPreviewSeoNodePhrases(nodes, phrases = [], ancestors = []) {
  normalizeMenuNodes(nodes).forEach((node) => {
    if (!node || typeof node !== "object") return;

    const label = getNodeLabel(node);
    const nextAncestors = label ? [...ancestors, label] : ancestors;
    const children = Array.isArray(node.children) ? node.children : [];

    if (nextAncestors.length >= 2) {
      const phrase = buildSectionSeoPhrase(nextAncestors);
      if (phrase) phrases.push(phrase);
    }

    if (children.length > 0) {
      collectPreviewSeoNodePhrases(children, phrases, nextAncestors);
    }
  });

  return phrases;
}

function collectPreviewSeoPhrasesFromSections(sections = [], phrases = []) {
  if (!Array.isArray(sections)) return phrases;

  sections.forEach((section) => {
    const sectionName = cleanText(section?.sectionName);
    const cards = Array.isArray(section?.cards) ? section.cards : [];

    cards.forEach((card) => {
      const cardTitle = cleanText(card?.title);
      const options = Array.isArray(card?.options) ? card.options : [];

      if (card?.simple || options.length === 0) {
        const phrase = buildSectionSeoPhrase([sectionName, cardTitle]);
        if (phrase) phrases.push(phrase);
        return;
      }

      options.forEach((option) => {
        const optionLabel = cleanText(option?.label);
        const subOptions = Array.isArray(option?.subOptions) ? option.subOptions : [];

        if (subOptions.length === 0) {
          const phrase = buildSectionSeoPhrase([sectionName, cardTitle, optionLabel]);
          if (phrase) phrases.push(phrase);
          return;
        }

        subOptions.forEach((subOption) => {
          const subLabel = cleanText(subOption?.label);
          const subSubOptions = Array.isArray(subOption?.subSubOptions) ? subOption.subSubOptions : [];

          if (subSubOptions.length === 0) {
            const phrase = buildSectionSeoPhrase([sectionName, cardTitle, optionLabel, subLabel]);
            if (phrase) phrases.push(phrase);
            return;
          }

          subSubOptions.forEach((subSubOption) => {
            const subSubLabel = cleanText(subSubOption?.label);
            const phrase = buildSectionSeoPhrase([
              sectionName,
              cardTitle,
              optionLabel,
              subLabel,
              subSubLabel,
            ]);
            if (phrase) phrases.push(phrase);
          });
        });
      });
    });
  });

  return phrases;
}

function collectPreviewSeoCardTitles(sections = [], titles = []) {
  if (!Array.isArray(sections)) return titles;

  sections.forEach((section) => {
    const cards = Array.isArray(section?.cards) ? section.cards : [];
    cards.forEach((card) => {
      const title = cleanText(card?.title);
      if (title) titles.push(title);
    });
  });

  return titles;
}

function buildPreviewSeoData(activeMenuTree, convertedSections, categoryObj) {
  const normalizedTree = normalizeMenuNodes(activeMenuTree);
  const sectionTitles = Array.isArray(convertedSections)
    ? uniqueStrings([
        ...convertedSections.map((section) => cleanText(section?.sectionName)).filter(Boolean),
        ...collectPreviewSeoCardTitles(convertedSections, []),
      ])
    : normalizedTree.map((node) => getNodeLabel(node)).filter(Boolean);
  const phraseNames = uniqueStrings([
    ...collectPreviewSeoPhrasesFromSections(convertedSections, []),
    ...collectPreviewSeoNodePhrases(normalizedTree, []),
    ...collectPreviewSeoPathPhrases(normalizedTree, []),
  ]).slice(0, 60);

  return {
    categoryName: cleanText(categoryObj?.name),
    phraseNames,
    groupNames: uniqueStrings(collectPreviewSeoGroupNames(normalizedTree, [])),
    sectionTitles: uniqueStrings(sectionTitles),
    itemNames: uniqueStrings(collectPreviewSeoItemNames(normalizedTree, [])).slice(0, 40),
  };
}

export function buildPreviewSeoDataFromTree(activeMenuTree, categoryObj) {
  return buildPreviewSeoData(activeMenuTree, [], categoryObj);
}

function buildSeoSectionsFromPricingTree(tree, nameMap) {
  const getName = (node) => cleanText(node?.name || nameMap?.[node?.categoryId] || "");

  const result = (Array.isArray(tree) ? tree : [])
    .map((level0) => {
      const children = Array.isArray(level0?.children) ? level0.children : [];

      if (level0?.isLeaf && level0?.pricingStatus === "Active") {
        return {
          sectionName: getName(level0),
          cards: [
            {
              title: getName(level0),
              options: [],
              simple: true,
            },
          ],
        };
      }

      const activeLeaves = children.filter((child) => child?.isLeaf && child?.pricingStatus === "Active");
      const allChildrenAreLeaves = children.length > 0 && children.every((child) => child?.isLeaf);

      if (activeLeaves.length > 1 && allChildrenAreLeaves) {
        return {
          sectionName: getName(level0),
          cards: [
            {
              title: getName(level0),
              simple: false,
              options: activeLeaves.map((child) => ({
                label: getName(child),
                subOptions: [],
              })),
            },
          ],
        };
      }

      const cards = children
        .map((level1) => {
          if (level1?.isLeaf && level1?.pricingStatus === "Active") {
            return {
              title: getName(level1),
              options: [],
              simple: true,
            };
          }

          const options = [];

          (Array.isArray(level1?.children) ? level1.children : []).forEach((level2) => {
            if (level2?.isLeaf && level2?.pricingStatus === "Active") {
              options.push({
                label: getName(level2),
                subOptions: [],
              });
              return;
            }

            if (Array.isArray(level2?.children) && level2.children.length > 0) {
              const subOptions = level2.children
                .map((level3) => {
                  if (level3?.isLeaf && level3?.pricingStatus === "Active") {
                    return {
                      label: getName(level3),
                    };
                  }

                  if (Array.isArray(level3?.children) && level3.children.length > 0) {
                    const subSubOptions = level3.children
                      .filter((child) => child?.isLeaf && child?.pricingStatus === "Active")
                      .map((child) => ({
                        label: getName(child),
                      }));

                    if (subSubOptions.length > 0) {
                      return {
                        label: getName(level3),
                        subSubOptions,
                      };
                    }
                  }

                  return null;
                })
                .filter(Boolean);

              if (subOptions.length > 0) {
                options.push({
                  label: getName(level2),
                  subOptions,
                });
              }
            }
          });

          if (!options.length) return null;

          return {
            title: getName(level1),
            options,
            simple: false,
          };
        })
        .filter(Boolean);

      if (!cards.length) return null;

      return {
        sectionName: getName(level0),
        cards,
      };
    })
    .filter((section) => section?.sectionName && section?.cards?.length);

  return result;
}

function cloneCustomPackageNode(node) {
  return {
    _id: node?._id,
    id: node?._id,
    vendorCustomPackageId: node?._id,
    name: cleanText(node?.name),
    imageUrl: cleanText(node?.imageUrl),
    packagesIncludes: cleanText(node?.packagesIncludes),
    terms: cleanText(node?.terms),
    offerText: cleanText(node?.offerText),
    pricingStatus: cleanText(node?.pricingStatus) || "Active",
    isLeaf: node?.isLeaf !== false,
    price: node?.isLeaf === false ? null : Number(node?.price) || 0,
    sequence: Number.isFinite(Number(node?.sequence)) ? Number(node.sequence) : 0,
    sourceType: "custom_package",
    children: Array.isArray(node?.children) ? node.children.map(cloneCustomPackageNode) : [],
  };
}

function normalizePreviewPricingTree(nodes = []) {
  return (Array.isArray(nodes) ? nodes : []).map((node) => {
    const normalizedId = node?.categoryId || node?.id || node?._id || null;
    return {
      ...node,
      _id: node?._id || normalizedId,
      id: node?.id || normalizedId,
      categoryId: normalizedId,
      children: normalizePreviewPricingTree(node?.children || []),
    };
  });
}

function mergeCustomPackagesIntoPricingTree(pricingTree, customTree, nameMap, rootCategoryId) {
  const clonedTree = Array.isArray(pricingTree) ? safeClone(pricingTree) : [];
  const packagesTargets = new Map();
  const standardTargets = new Map();

  const getEffectiveCustomType = (value) => {
    const normalized = cleanText(value).toLowerCase();
    if (normalized === "service_item" || normalized === "offer") return normalized;
    return "package";
  };

  const ensureCustomMergeContainer = (targetNode) => {
    if (!targetNode || targetNode.isLeaf !== true) return targetNode;

    const existingChildren = Array.isArray(targetNode.children) ? targetNode.children : [];
    const originalLeafId = String(
      targetNode._id || targetNode.id || targetNode.categoryId || `leaf-${Date.now()}`
    );
    const originalLeafNode = {
      ...safeClone(targetNode),
      _id: `${originalLeafId}-base`,
      id: `${originalLeafId}-base`,
      children: [],
    };

    targetNode.isLeaf = false;
    targetNode.price = null;
    targetNode.children = [originalLeafNode, ...existingChildren];
    return targetNode;
  };

  function walkStandard(nodes, parentNode = null) {
    (nodes || []).forEach((node) => {
      const standardKey =
        node?.categoryId || node?._id ? `standard:${String(node.categoryId || node._id)}` : null;
      if (standardKey) {
        standardTargets.set(standardKey, node);
      }

      const resolvedName = nameMap?.[node?.categoryId] || node?.name || "";
      if (cleanText(resolvedName).toLowerCase() === "packages") {
        const key =
          parentNode?.categoryId || parentNode?._id
            ? `standard:${String(parentNode.categoryId || parentNode._id)}`
            : `root:${String(rootCategoryId)}`;
        packagesTargets.set(key, node);
      }

      if (Array.isArray(node?.children) && node.children.length > 0) {
        walkStandard(node.children, node);
      }
    });
  }

  walkStandard(clonedTree, null);

  (customTree || []).forEach((customNode) => {
    if (!customNode || customNode.parentNodeType === "custom_package") return;

    let targetKey = null;
    const effectiveCustomType = getEffectiveCustomType(customNode.customType);

    if (customNode.parentNodeType === "root") {
      targetKey = `root:${String(rootCategoryId)}`;
    } else if (
      (customNode.parentNodeType === "standard_subcategory" ||
        customNode.parentNodeType === "standard_category") &&
      customNode.parentNodeId
    ) {
      targetKey = `standard:${String(customNode.parentNodeId)}`;
    }

    if (!targetKey) return;

    let targetNode = null;
    if (effectiveCustomType === "package") {
      targetNode = standardTargets.get(targetKey) || packagesTargets.get(targetKey);
    } else {
      targetNode = standardTargets.get(targetKey);
    }
    if (!targetNode) return;

    if (targetNode.isLeaf === true) {
      targetNode = ensureCustomMergeContainer(targetNode);
    }

    if (!Array.isArray(targetNode.children)) {
      targetNode.children = [];
    }

    targetNode.children.push(cloneCustomPackageNode(customNode));
  });

  return clonedTree;
}

function filterActiveMenuTree(nodes) {
  if (!Array.isArray(nodes)) return [];

  return nodes.reduce((acc, node) => {
    if (!node || typeof node !== "object") return acc;

    const children = Array.isArray(node.children) ? node.children : [];
    const filteredChildren = filterActiveMenuTree(children);
    const isActiveLeaf =
      node.isLeaf && node.pricingStatus === "Active" && node.price !== undefined && node.price !== null;

    if (isActiveLeaf) {
      acc.push({
        ...node,
        children: [],
      });
      return acc;
    }

    if (filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren,
      });
    }

    return acc;
  }, []);
}

export function buildPreviewSeoDataFromPricing({
  pricingTree,
  customPackagesTree,
  categoryTree,
  categoryObj,
  rootCategoryId,
  pricingSource,
}) {
  const normalizedPricingTree = normalizePreviewPricingTree(
    pricingSource === "self_managed" ? pricingTree?.children || [] : pricingTree?.tree || []
  );

  const nameMap = buildNameMapFromTree(categoryTree);
  const mergedPricingTree =
    pricingSource === "self_managed"
      ? normalizedPricingTree
      : mergeCustomPackagesIntoPricingTree(
          normalizedPricingTree,
          customPackagesTree || [],
          nameMap,
          rootCategoryId
        );
  const activeMenuTree = filterActiveMenuTree(mergedPricingTree);
  const convertedSections = buildSeoSectionsFromPricingTree(mergedPricingTree, nameMap);

  return buildPreviewSeoData(activeMenuTree, convertedSections, categoryObj);
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
  const maxServices = 20;

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
      if (added >= limit || selected.length >= maxServices) break;
      if (pushCandidate(candidate)) {
        added += 1;
      }
    }
  };

  // Start with major user-facing service families from the profile so
  // broad but important offerings like "Elder Care" are always represented.
  consumeBucket(sourceBuckets.section, 8);

  // Then keep meaningful service groups visible before drilling into many
  // near-duplicate long-tail variations from a single family.
  consumeBucket(sourceBuckets.group, 6);

  // Fill the remaining slots with specific SEO phrases and leaf items.
  consumeBucket(sourceBuckets.phrase, 10);
  consumeBucket(sourceBuckets.item, 4);

  for (const candidate of scoredCandidates) {
    if (selected.length >= maxServices) break;
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
    const primarySearchAreas = uniqueStrings([primaryLocality, city, ...targetAreas]).slice(0, 3);
    if (primarySearchAreas.length > 0) {
      description += `. Popular offerings include ${services.join(", ")} in ${primarySearchAreas.join(", ")}`;
    } else {
      description += `. Popular offerings include ${services.join(", ")}`;
    }
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
