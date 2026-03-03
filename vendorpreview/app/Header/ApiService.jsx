/**
 * Fetch full category tree
 * @param {string} rootCategoryId
 */
export async function fetchCategories(rootCategoryId) {
  if (!rootCategoryId) {
    throw new Error("rootCategoryId is required");
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const url = `${baseUrl}/api/categories/tree?rootCategoryId=${rootCategoryId}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch category tree");
  }

  const rawTree = await res.json();

  if (!rawTree || !rawTree.id) {
    return [];
  }

  // 🔥 Normalize id → _id so existing logic continues to work
  function normalizeTree(node) {
    return {
      ...node,
      _id: node.id,
      children: (node.children || []).map(normalizeTree),
    };
  }

  const normalizedRoot = normalizeTree(rawTree);

  // Return children directly to avoid extra root level
  return normalizedRoot.children || [];
}