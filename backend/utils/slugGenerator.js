const STOP_WORDS = new Set(["the", "and", "by", "for", "best", "services"]);

function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeStopWords(str = "") {
  return str
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(" ");
}

function toSlug(str = "") {
  return str
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$|/g, "")
    .toLowerCase();
}

function truncateSlug(slug = "", maxLen = 28) {
  if (slug.length <= maxLen) return slug;
  return slug.slice(0, maxLen).replace(/-+$/g, "");
}

function generateSlugSuggestions({ businessName, category, city, locality } = {}) {
  const brand = removeStopWords(normalize(businessName));
  const cat = removeStopWords(normalize(category));
  const cty = removeStopWords(normalize(city));
  const loc = removeStopWords(normalize(locality));

  const parts = {
    brand,
    cat,
    cty,
    loc,
  };

  const candidates = [];

  if (parts.brand) candidates.push(parts.brand);
  if (parts.brand && parts.cat) candidates.push(`${parts.brand} ${parts.cat}`);
  if (parts.brand && parts.loc) candidates.push(`${parts.brand} ${parts.loc}`);
  if (parts.cat && parts.loc && parts.brand) {
    candidates.push(`${parts.cat} ${parts.loc} ${parts.brand}`);
  }

  const slugs = candidates
    .map(toSlug)
    .filter(Boolean)
    .map((s) => truncateSlug(s, 28));

  const unique = Array.from(new Set(slugs));
  unique.sort((a, b) => a.length - b.length);
  return unique;
}

module.exports = { generateSlugSuggestions };
