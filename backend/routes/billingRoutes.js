const express = require("express");
const router = express.Router();

const billingController = require("../controllers/billingController");

router.post("/create", billingController.createBillingSession);
router.post("/update", billingController.updateBillingCart);
router.get("/:id", billingController.getBillingSession);

router.post("/request-otp", billingController.requestRedeemOTP);
router.post("/verify-otp", billingController.verifyRedeemOTP);

router.post("/complete", billingController.completeBillingSession);

module.exports = router;
