const express = require("express");
const {
  getTrustQuestions,
  saveTrustProfile,
  getVendorTrustProfile,
} = require("../controllers/trustProfileController");

const router = express.Router();

router.get("/questions", getTrustQuestions);
router.post("/save", saveTrustProfile);
router.get("/vendor/:vendorId", getVendorTrustProfile);

module.exports = router;
