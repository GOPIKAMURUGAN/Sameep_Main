const express = require("express");
const router = express.Router();

const {
  getVendorResources,
  createVendorResource,
  updateVendorResource,
  deleteVendorResource,
} = require("../controllers/vendorResourceController");
const VendorResource = require("../models/VendorResource");

router.get("/", getVendorResources);
router.post("/", createVendorResource);
router.put("/:id", updateVendorResource);
router.delete("/:id", deleteVendorResource);
router.put("/:id/activate", async (req, res) => {
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
