function normalizeNode(n) {
  return {
    id: String(n._id),
    name: n.name?.trim(),
    imageUrl: n.imageUrl ?? null,
    iconUrl: n.iconUrl ?? null,
    price: typeof n.price === "number" ? n.price : n.price ?? null,
    pricingStatus: n.pricingStatus,
    visibleToUser: n.visibleToUser,
    visibleToVendor: n.visibleToVendor,
    terms: n.terms || "",
    packagesIncludes: n.packagesIncludes || "",
    offerText: n.offerText || "",
    inventoryLabelName: n.inventoryLabelName || "",
    parentSelectorLabel: n.parentSelectorLabel || "",
    sequence: n.sequence ?? 0,
    enableFreeText: n.enableFreeText ?? false,
    freeText: n.freeText || "",
    level: 0,
    isLeaf: false,
    children: [],
  };
}

function applyVisibilityFilter(nodes, filterMode) {
  if (filterMode === "user") {
    return nodes.filter((n) => n.visibleToUser === true);
  }
  if (filterMode === "vendor") {
    return nodes.filter((n) => n.visibleToVendor === true);
  }
  return nodes;
}

function buildTree(nodes, options = {}) {
  if (!Array.isArray(nodes)) return { tree: [], flat: [] };

  const filterMode = options.filterMode || "admin";
  const filtered = applyVisibilityFilter(nodes, filterMode);

  const map = new Map();
  const seqMap = new Map();
  const roots = [];

  filtered.forEach((n) => {
    const id = String(n._id);
    map.set(id, normalizeNode(n));
    seqMap.set(id, Number(n.sequence) || 0);
  });

  filtered.forEach((n) => {
    const id = String(n._id);
    const parentId = n.parentSubcategory ? String(n.parentSubcategory) : null;
    const node = map.get(id);
    if (!node) return;

    if (!parentId) {
      roots.push(node);
    } else {
      const parent = map.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node); // fallback if parent missing
    }
  });

  const sortChildren = (arr) => {
    arr.sort((a, b) => (seqMap.get(a.id) || 0) - (seqMap.get(b.id) || 0));
    arr.forEach((c) => c.children && sortChildren(c.children));
  };

  const setLevels = (node, level) => {
    node.level = level;
    node.children.forEach((c) => setLevels(c, level + 1));
    node.isLeaf = node.children.length === 0;
  };

  sortChildren(roots);
  roots.forEach((r) => setLevels(r, 1));

  const flat = [];
  const flatten = (node) => {
    const { children, ...rest } = node;
    flat.push(rest);
    children.forEach(flatten);
  };
  roots.forEach(flatten);

  return { tree: roots, flat };
}

module.exports = { buildTree };
