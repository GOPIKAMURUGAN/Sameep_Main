const express = require("express");
const router = express.Router();

const {
  getVendorResources,
  createVendorResource,
  updateVendorResource,
  deleteVendorResource,
} = require("../controllers/vendorResourceController");
const VendorResource = require("../models/VendorResource");
const {
  requireVendorBodyWriteAccess,
  requireOwnedDocumentVendorAccess,
} = require("../utils/vendorWriteAuth");

router.get("/", getVendorResources);
router.post("/", requireVendorBodyWriteAccess(), createVendorResource);
router.put("/:id", requireOwnedDocumentVendorAccess(VendorResource), updateVendorResource);
router.delete("/:id", requireOwnedDocumentVendorAccess(VendorResource), deleteVendorResource);
router.put("/:id/activate", requireOwnedDocumentVendorAccess(VendorResource), async (req, res) => {
  try {
    const resource = await VendorResource.findByIdAndUpdate(
      req.params.id,
      { status: "Active" },
      { new: true }
    );

    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
