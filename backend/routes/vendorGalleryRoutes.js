const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const DummyVendor = require("../models/DummyVendor");
const DummyCategory = require("../models/dummyCategory");
const VendorGalleryAlbum = require("../models/VendorGalleryAlbum");
const { uploadBufferToS3WithLabel, deleteS3ObjectByUrl } = require("../utils/s3Upload");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return String(value || "").toLowerCase();
}

function defaultAlbumsForCategory(categoryName = "") {
  const name = normalizeName(categoryName);

  if (name.includes("mehendi") || name.includes("mehndi")) {
    return [
      "Bridal Mehendi",
      "Engagement Mehendi",
      "Arabic Designs",
      "Traditional Designs",
      "Minimal Designs",
      "Full Hand",
      "Foot Mehendi",
    ];
  }

  if (name.includes("makeup") || name.includes("makeover")) {
    return [
      "Bridal",
      "Engagement",
      "Reception",
      "Party",
      "Photoshoot",
      "Hair Styling",
      "Saree Draping",
      "Groom Makeup",
    ];
  }

  if (name.includes("decor") || name.includes("event")) {
    return [
      "Wedding Decor",
      "Engagement Decor",
      "Birthday Decor",
      "Stage Decor",
      "Mandap Decor",
      "Floral Decor",
      "Entrance Decor",
    ];
  }

  if (name.includes("salon") || name.includes("spa") || name.includes("grooming")) {
    return [
      "Haircuts",
      "Hair Colour",
      "Facial",
      "Bridal Packages",
      "Before & After",
    ];
  }

  return ["Featured Work", "Latest Work", "Customer Favorites"];
}

function getVendorDisplayName(vendor) {
  return vendor?.businessName || vendor?.contactName || vendor?.name || "Vendor";
}

async function getCategoryName(vendor) {
  if (!vendor?.categoryId) return "";
  const category = await DummyCategory.findById(vendor.categoryId, "name").lean();
  return category?.name || "";
}

async function ensureDefaultAlbums(vendor) {
  const existing = await VendorGalleryAlbum.find({ vendorId: vendor._id }).select("slug").lean();
  const existingSlugs = new Set(existing.map((album) => album.slug));
  if (existingSlugs.size > 0) return;

  const categoryName = await getCategoryName(vendor);
  const titles = defaultAlbumsForCategory(categoryName);
  const docs = titles.map((title, index) => ({
    vendorId: vendor._id,
    title,
    slug: slugify(title),
    sequence: index + 1,
    sourceType: "system_default",
    isActive: true,
  }));

  if (docs.length) {
    await VendorGalleryAlbum.insertMany(docs, { ordered: false }).catch(() => {});
  }
}

function formatAlbum(album) {
  const doc = typeof album.toObject === "function" ? album.toObject() : album;
  const activeImages = Array.isArray(doc.images)
    ? doc.images.filter((img) => img?.isActive !== false)
    : [];
  const coverImageUrl = doc.coverImageUrl || activeImages[0]?.imageUrl || "";

  return {
    ...doc,
    coverImageUrl,
    images: activeImages.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
    imageCount: activeImages.length,
  };
}

router.get("/:vendorId", async (req, res) => {
  try {
    const vendor = await DummyVendor.findById(req.params.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    await ensureDefaultAlbums(vendor);
    const albums = await VendorGalleryAlbum.find({ vendorId: vendor._id })
      .sort({ sequence: 1, createdAt: 1 })
      .lean();

    return res.json({ success: true, albums: albums.map(formatAlbum) });
  } catch (err) {
    console.error("GET /vendor-gallery/:vendorId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/:vendorId/albums", async (req, res) => {
  try {
    const vendor = await DummyVendor.findById(req.params.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ success: false, message: "Album title is required" });

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 2;
    while (await VendorGalleryAlbum.exists({ vendorId: vendor._id, slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const count = await VendorGalleryAlbum.countDocuments({ vendorId: vendor._id });
    const album = await VendorGalleryAlbum.create({
      vendorId: vendor._id,
      title,
      slug,
      description: String(req.body?.description || "").trim(),
      sequence: Number(req.body?.sequence || count + 1),
      sourceType: "vendor_created",
      isActive: req.body?.isActive !== false,
    });

    return res.status(201).json({ success: true, album: formatAlbum(album) });
  } catch (err) {
    console.error("POST /vendor-gallery/:vendorId/albums error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/:vendorId/albums/:albumId", async (req, res) => {
  try {
    const update = {};
    if (req.body?.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ success: false, message: "Album title is required" });
      update.title = title;
    }
    if (req.body?.description !== undefined) update.description = String(req.body.description || "").trim();
    if (req.body?.coverImageUrl !== undefined) update.coverImageUrl = String(req.body.coverImageUrl || "").trim();
    if (req.body?.sequence !== undefined) update.sequence = Number(req.body.sequence || 0);
    if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);

    const album = await VendorGalleryAlbum.findOneAndUpdate(
      { _id: req.params.albumId, vendorId: req.params.vendorId },
      { $set: update },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    return res.json({ success: true, album: formatAlbum(album) });
  } catch (err) {
    console.error("PATCH /vendor-gallery/:vendorId/albums/:albumId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:vendorId/albums/:albumId", async (req, res) => {
  try {
    const album = await VendorGalleryAlbum.findOne({
      _id: req.params.albumId,
      vendorId: req.params.vendorId,
    });
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    const imageUrls = Array.isArray(album.images)
      ? album.images.map((image) => image?.imageUrl).filter(Boolean)
      : [];

    await album.deleteOne();

    for (const imageUrl of imageUrls) {
      try {
        await deleteS3ObjectByUrl(imageUrl);
      } catch {}
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /vendor-gallery/:vendorId/albums/:albumId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/:vendorId/albums/:albumId/images", upload.any(), async (req, res) => {
  try {
    const vendor = await DummyVendor.findById(req.params.vendorId).lean();
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    const album = await VendorGalleryAlbum.findOne({ _id: req.params.albumId, vendorId: vendor._id });
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    const files = (Array.isArray(req.files) ? req.files : [])
      .filter((file) => ["images", "image", "file", "files"].includes(file.fieldname))
      .slice(0, 20);
    if (!files.length) return res.status(400).json({ success: false, message: "Select at least one image" });

    const categoryName = await getCategoryName(vendor);
    const baseSegments = [
      `${getVendorDisplayName(vendor)} - ${categoryName || "Gallery"}`,
      "gallery",
      album.title,
    ];

    const uploadedImages = [];
    for (const file of files) {
      if (!file?.buffer || !file?.mimetype) continue;
      const uploaded = await uploadBufferToS3WithLabel(
        file.buffer,
        file.mimetype,
        "newvendor",
        uuidv4(),
        { segments: baseSegments }
      );
      uploadedImages.push({
        imageUrl: uploaded.url,
        sequence: album.images.length + uploadedImages.length + 1,
      });
    }

    album.images.push(...uploadedImages);
    if (!album.coverImageUrl && uploadedImages[0]?.imageUrl) {
      album.coverImageUrl = uploadedImages[0].imageUrl;
    }
    await album.save();

    return res.json({ success: true, album: formatAlbum(album), images: formatAlbum(album).images });
  } catch (err) {
    console.error("POST /vendor-gallery/:vendorId/albums/:albumId/images error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:vendorId/albums/:albumId/images/:imageId", async (req, res) => {
  try {
    const album = await VendorGalleryAlbum.findOne({
      _id: req.params.albumId,
      vendorId: req.params.vendorId,
    });
    if (!album) return res.status(404).json({ success: false, message: "Album not found" });

    const image = album.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ success: false, message: "Image not found" });

    const removedUrl = image.imageUrl;
    image.deleteOne();
    if (album.coverImageUrl === removedUrl) {
      const nextActive = album.images.find((img) => img?.imageUrl && img?.isActive !== false);
      album.coverImageUrl = nextActive?.imageUrl || "";
    }
    await album.save();

    if (removedUrl) {
      try {
        await deleteS3ObjectByUrl(removedUrl);
      } catch {}
    }

    return res.json({ success: true, album: formatAlbum(album) });
  } catch (err) {
    console.error("DELETE /vendor-gallery/:vendorId/albums/:albumId/images/:imageId error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
