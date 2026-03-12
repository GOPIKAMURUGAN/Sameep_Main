const LoyaltyLedger = require("../models/LoyaltyLedger");

async function calculateCustomerBalance(customerId, vendorId) {
  const now = new Date();

  const earns = await LoyaltyLedger.find({
    customerId,
    vendorId,
    type: "EARN",
    remainingPoints: { $gt: 0 },
  });

  let availablePoints = 0;

  earns.forEach((e) => {
    const expiry = e.expiryDate;

    if (!expiry || new Date(expiry) >= now) {
      availablePoints += e.remainingPoints || 0;
    }
  });

  return availablePoints;
}

module.exports = { calculateCustomerBalance };
