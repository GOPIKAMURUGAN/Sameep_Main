const fetch = global.fetch;

console.log("🔥 CATEGORY CLONE SCRIPT STARTED");

/******** CONFIG ********/
const ROOT_ID = "69913efbeca3f72d376ddaa8";

const SOURCE = `http://localhost:5001/api/categories/tree?rootCategoryId=${ROOT_ID}`;

const TARGET = "https://api.ynot.co.in";

/******** IMAGE SAFE ********/
async function getImageBlob(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return await res.blob();
  } catch {
    console.log("⚠️ Image fetch failed:", url);
    return null;
  }
}

/******** CREATE CATEGORY ********/
async function createCategory(node, parentId) {
  const form = new FormData();

  form.append("name", node.name);
  form.append("visibleToUser", node.visibleToUser ?? true);
  form.append("visibleToVendor", node.visibleToVendor ?? true);
  form.append("sequence", node.sequence ?? 0);
  form.append("categoryType", "Products");

  if (parentId) form.append("parentId", parentId);
  if (node.terms) form.append("terms", node.terms);

  if (node.price !== null && node.price !== undefined) {
    form.append("price", node.price);
  }

  if (node.packagesIncludes) {
    form.append("packagesIncludes", node.packagesIncludes);
  }

  if (node.offerText) {
    form.append("offerText", node.offerText);
  }

  if (node.enableFreeText !== undefined) {
    form.append("enableFreeText", node.enableFreeText);
  }

  const blob = await getImageBlob(node.imageUrl);
  if (blob) form.append("image", blob, "image.jpg");

  const res = await fetch(`${TARGET}/api/dummy-categories`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.message === "Category already exists") {
      console.log(`↩ Exists → ${node.name}`);

      const existingId = await findExistingCategory(node.name, parentId);
      return existingId;
    }

    console.log(`❌ Failed → ${node.name}`, data);
    return null;
  }

  console.log(`✅ Created → ${node.name}`);
  return data._id;
}

/******** FIND EXISTING CATEGORY ********/
async function findExistingCategory(name, parentId) {
  try {
    const url = `${TARGET}/api/dummy-categories?name=${encodeURIComponent(
      name
    )}&parentId=${parentId || ""}`;

    const res = await fetch(url);
    const data = await res.json();

    return data?._id || null;
  } catch {
    return null;
  }
}

/******** RECURSIVE COPY ********/
async function copyNode(node, parentId = null) {
  const newId = await createCategory(node, parentId);

  const effectiveParentId = newId || parentId;

  if (node.children?.length) {
    for (const child of node.children) {
      await copyNode(child, effectiveParentId);
    }
  }
}

/******** MAIN ********/
async function migrate() {
  console.log("🚀 TREE-BASED CATEGORY MIGRATION");

  const res = await fetch(SOURCE);
  const data = await res.json();

  console.log("📡 SOURCE:", SOURCE);
  console.log("🎯 TARGET:", TARGET);
  console.log("📁 ROOT FROM API:", data.name);
  console.log("📦 CHILD COUNT:", data.children?.length);

  const root = data;

  const ROOT_ID_NEW = await createCategory(root, null);

  console.log("📁 ROOT CREATED:", ROOT_ID_NEW);

  for (const child of root.children) {
    await copyNode(child, ROOT_ID_NEW);
  }

  console.log("✅ DONE — PERFECT CLONE");
}

migrate();