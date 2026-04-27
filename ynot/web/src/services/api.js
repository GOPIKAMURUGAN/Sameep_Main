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

export const getTrustedPartners = async (limit = 8) => {
  const res = await fetch(`/api/trusted-partners?limit=${encodeURIComponent(limit)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load trusted partners");
  }

  return res.json();
};
