export const getCategories = async () => {
  const res = await fetch("/api/categories", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load categories");
  }

  return res.json();
};
