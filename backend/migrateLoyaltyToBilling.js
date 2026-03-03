require("dotenv").config();
const mongoose = require("mongoose");

const BillingSession = require("./models/BillingSession");
const LoyaltyLedger = require("./models/LoyaltyLedger");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Mongo connected");

  const ledgers = await LoyaltyLedger.aggregate([
    {
      $group: {
        _id: "$transactionId",
        earned: {
          $sum: {
            $cond: [{ $eq: ["$type", "EARN"] }, "$points", 0]
          }
        },
        redeemed: {
          $sum: {
            $cond: [{ $eq: ["$type", "REDEEM"] }, { $abs: "$points" }, 0]
          }
        }
      }
    }
  ]);

  console.log(`🔍 Found ${ledgers.length} transactions`);

  let updated = 0;

  for (const row of ledgers) {
    const session = await BillingSession.findById(row._id);
    if (!session) continue;

    session.pointsEarned = row.earned || 0;
    session.pointsRedeemed = row.redeemed || 0;

    await session.save();
    updated++;
  }

  console.log(`🎉 Updated ${updated} billing sessions`);
  process.exit();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});