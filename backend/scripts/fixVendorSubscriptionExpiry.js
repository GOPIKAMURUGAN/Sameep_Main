require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const VendorSubscription = require("../models/VendorSubscription");
const Plan = require("../models/Plan");

const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";

async function run() {
  try {
    await connectDB();

    const subscriptions = await VendorSubscription.find({
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
      ],
    }).lean();

    console.log(
      `Found ${subscriptions.length} vendor subscriptions with missing expiryDate`
    );

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        const plan = await Plan.findById(sub.planId).lean();

        if (!plan) {
          skippedCount += 1;
          console.warn(
            `Skipping vendorId=${sub.vendorId} because plan ${sub.planId} was not found`
          );
          continue;
        }

        const baseStartDate = sub.startDate || sub.createdAt;

        if (!baseStartDate) {
          skippedCount += 1;
          console.warn(
            `Skipping vendorId=${sub.vendorId} because startDate and createdAt are missing`
          );
          continue;
        }

        const expiryDate = new Date(baseStartDate);

        if (plan.billingCycle === "yearly") {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else if (plan.billingCycle === "monthly") {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          skippedCount += 1;
          console.warn(
            `Skipping vendorId=${sub.vendorId} because billingCycle=${plan.billingCycle} is unsupported`
          );
          continue;
        }

        console.log(
          `[${DRY_RUN ? "DRY RUN" : "UPDATE"}] vendorId=${sub.vendorId} oldExpiry=null newExpiry=${expiryDate.toISOString()}`
        );

        if (!DRY_RUN) {
          await VendorSubscription.updateOne(
            { _id: sub._id },
            { $set: { expiryDate } }
          );
        }

        updatedCount += 1;
      } catch (subError) {
        failedCount += 1;
        console.error(
          `Failed processing vendorId=${sub.vendorId}:`,
          subError.message
        );
      }
    }

    console.log(
      `Summary -> matched: ${subscriptions.length}, updated: ${updatedCount}, skipped: ${skippedCount}, failed: ${failedCount}, dryRun: ${DRY_RUN}`
    );
    console.log("Migration completed successfully");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

run();
