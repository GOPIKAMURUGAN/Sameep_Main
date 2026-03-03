const express = require("express");
const router = express.Router();
const { getVendorCustomer } = require("../controllers/vendorCustomerController");

router.get("/customer", getVendorCustomer);

module.exports = router;
