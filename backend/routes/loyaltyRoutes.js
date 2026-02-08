const express = require("express");
const router = express.Router();

const loyaltyController = require("../controllers/loyaltyController");

router.post("/vendor-rule", loyaltyController.upsertVendorRule);
router.get("/vendor-rule/:vendorId", loyaltyController.getVendorRule);
router.get("/wallet", loyaltyController.getWallet);

module.exports = router;
