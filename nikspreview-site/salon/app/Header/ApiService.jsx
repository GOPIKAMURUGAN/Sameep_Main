/**
 * Fetch categories or subcategories
 * @param {string | null} parentId
 */
export async function fetchCategories(parentId = null) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const url = parentId
    ? `${baseUrl}/api/dummy-categories?parentId=${parentId}`
    : `${baseUrl}/api/dummy-categories`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
