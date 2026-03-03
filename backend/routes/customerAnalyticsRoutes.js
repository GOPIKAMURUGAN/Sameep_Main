const express = require("express");
const router = express.Router();
const { getCustomerAnalytics } = require("../controllers/customerAnalyticsController");

router.get("/customers", getCustomerAnalytics);

module.exports = router;
