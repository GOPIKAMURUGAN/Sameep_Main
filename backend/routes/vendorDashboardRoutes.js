const express = require("express");
const router = express.Router();
const controller = require("../controllers/vendorDashboardController");

router.get("/summary", controller.getDashboardSummary);

module.exports = router;
