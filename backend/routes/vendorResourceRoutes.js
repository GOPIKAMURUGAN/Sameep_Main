const express = require("express");
const router = express.Router();

const {
  getVendorResources,
  createVendorResource,
  updateVendorResource,
  deleteVendorResource,
} = require("../controllers/vendorResourceController");

router.get("/", getVendorResources);
router.post("/", createVendorResource);
router.put("/:id", updateVendorResource);
router.delete("/:id", deleteVendorResource);

module.exports = router;
