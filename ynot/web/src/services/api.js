export const getCategories = async () => {
  const res = await fetch("/api/categories", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load categories");
  }

  return res.json();
};

export const getSiteContact = async () => {
  const res = await fetch("/api/site-contact", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load site contact");
  }

  return res.json();
};

export const getTrustedPartners = async (limit) => {
  const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const res = await fetch(`/api/trusted-partners${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load trusted partners");
  }

  return res.json();
};

export const getDigitalScorePublicConfig = async (language) => {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  const res = await fetch(`/api/digital-score/public-config${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load digital score config");
  }

  const payload = await res.json();
  return payload?.data || null;
};

export const getDigitalScoreQuestions = async ({ language, category } = {}) => {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (category) params.set("category", category);
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(`/api/digital-score/questions${query}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load digital score questions");
  }

  const payload = await res.json();
  return payload?.data || [];
};

export const submitDigitalScore = async (submission) => {
  const res = await fetch("/api/digital-score/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submission),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.message || "Failed to submit digital score");
  }

  return payload?.data || null;
};
