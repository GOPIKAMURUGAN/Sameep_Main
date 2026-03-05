const express = require("express");
const { sendBillWhatsapp } = require("../utils/whatsappService");

const router = express.Router();

router.get("/whatsapp-test", async (req, res) => {
  try {
    const data = await sendBillWhatsapp({
      mobile: "919666060396",
      customerName: "Naresh",
      vendorName: "YNOT Salon",
      billAmount: 1000,
      earned: 100,
      redeemed: 0,
      finalPaid: 1000,
      balance: 250,
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "WhatsApp test failed",
      error: err?.response?.data || err.message,
    });
  }
});

module.exports = router;
