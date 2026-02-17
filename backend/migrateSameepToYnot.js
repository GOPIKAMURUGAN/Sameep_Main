/*****************************************************************
 FINAL UNIVERSAL MIGRATION (REAL SAMEEP API LOGIC)
 - Correct L2 detection
 - Yoga-style hierarchy
 - Works for ALL categories
*****************************************************************/

const fetch = global.fetch;

const SAMEEP = "https://sameep.go-kar.net:3001";
const YNOT = "http://localhost:5001";

const ROOT_NAME = "Tuitions"; // change anytime
const CITY = "Hyderabad";

/******** IMAGE SAFE ********/
async function getImageBlob(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return await res.blob();
  } catch {
    return null;
  }
}

/******** CREATE CATEGORY ********/
async function createCategory({ name, parentId, imageUrl, terms }) {
  const form = new FormData();

  form.append("name", name);
  form.append("visibleToUser", "true");
  form.append("visibleToVendor", "true");
  form.append("sequence", "0");
  form.append("categoryType", "Products");

  if (parentId) form.append("parentId", parentId);
  if (terms) form.append("terms", terms);

  const blob = await getImageBlob(imageUrl);
  if (blob) form.append("image", blob, "image.jpg");

  const res = await fetch(`${YNOT}/api/dummy-categories`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.message === "Category already exists") {
      console.log(`↩ Exists → ${name}`);
      return null;
    }
    console.log(`❌ Failed → ${name}`, data);
    return null;
  }

  console.log(`✅ Created → ${name}`);
  return data._id;
}

/******** PROCESS ADDONS ********/
async function processAddons(parentId, levelName) {
  const addons = await fetch(`${SAMEEP}/getServiceAddons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service: ROOT_NAME,
      serviceLevel: levelName,
    }),
  }).then((r) => r.json());

  if (!addons.result?.length) return;

  console.log(`📦 Addons Found: ${addons.result.length}`);

  for (const ad of addons.result) {
    await createCategory({
      name: ad.addon,
      parentId,
      terms: ad.includes,
      imageUrl: ad.addonImage,
    });
  }
}

/******** MAIN ********/
async function migrate() {
  console.log("\n🚀 FINAL UNIVERSAL MIGRATION");

  // ROOT
  const services = await fetch(
    `${SAMEEP}/getNewServices?city=${CITY}`
  ).then((r) => r.json());

  const root = services.getNewServices.find(
    (s) => s.serviceName === ROOT_NAME
  );

  const ROOT_ID = await createCategory({
    name: ROOT_NAME,
    imageUrl: root.primaryImage,
  });

  console.log("📁 ROOT →", ROOT_ID);

  // L1
  const l1Res = await fetch(
    `${SAMEEP}/getL1Services?service=${root._id}`
  ).then((r) => r.json());

  for (const l1 of l1Res.lev1Services) {
    const l1Name = l1.serviceLevel1?.trim();
    if (!l1Name || l1Name === "Locations") continue;

    console.log(`\n📁 L1 → ${l1Name}`);

    const L1_ID = await createCategory({
      name: l1Name,
      parentId: ROOT_ID,
      imageUrl: l1.secondaryImage,
    });

    // 🟡 If L1 is terminal → addons directly
    if (l1.endService === "YES") {
      await processAddons(L1_ID, l1Name);
      continue;
    }

    // 🟢 REAL L2 CALL (FIXED)
    const l2Res = await fetch(`${SAMEEP}/getL2Services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: l1._id }),
    }).then((r) => r.json());

    if (!l2Res.lev2Services?.length) continue;

    console.log(`📡 L2 Found: ${l2Res.lev2Services.length}`);

    for (const l2 of l2Res.lev2Services) {
      const l2Name = l2.serviceLevel2?.trim();
      if (!l2Name) continue;

      console.log(`   ├ L2 → ${l2Name}`);

      const L2_ID = await createCategory({
        name: l2Name,
        parentId: L1_ID,
        imageUrl: l2.secondaryImage,
      });

      await processAddons(L2_ID, l2Name);
    }
  }

  console.log("\n✅ DONE — PERFECT SAMEEP HIERARCHY");
}

migrate();