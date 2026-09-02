const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const BillingSession = require("../models/BillingSession");
const LoyaltyLedger = require("../models/LoyaltyLedger");

exports.getVendorCustomer = async (req, res) => {
  try {
    const { vendorId, phone, range = "all" } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: "phone required" });
    }

    const customer = await Customer.findOne({
      $or: [{ phone }, { fullNumber: phone }],
    }).lean();

    if (!customer) {
      return res.json({ success: true, data: null });
    }

    let rangeStart = null;
    if (range === "3m") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 90);
    } else if (range === "6m") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 180);
    } else if (range === "1y") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 365);
    }

    const billQuery = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      customerId: customer._id,
      status: "COMPLETED",
    };
    if (rangeStart) {
      billQuery.createdAt = { $gte: rangeStart };
    }

    const billsRaw = await BillingSession.find(billQuery)
      .sort({ createdAt: -1 })
      .lean();

    const transactionIds = billsRaw
      .map((b) => b.transactionId)
      .filter(Boolean)
      .map((id) => String(id));

    const ledgerMap = new Map();
    if (transactionIds.length) {
      const earnEntries = await LoyaltyLedger.find({
        type: "EARN",
        transactionId: { $in: transactionIds },
      })
        .select("transactionId points expiryDate")
        .lean();

      earnEntries.forEach((e) => {
        if (e.transactionId) {
          ledgerMap.set(String(e.transactionId), e);
        }
      });
    }

    const bills = billsRaw.map((bill) => {
      const items = bill.items || bill.cartItems || [];
      const earned = bill.pointsEarned || 0;
      const redeemed = bill.pointsRedeemed || 0;
      const ledger = bill.transactionId
        ? ledgerMap.get(String(bill.transactionId))
        : null;
      const now = new Date();
      let daysLeft = null;
      if (ledger?.expiryDate) {
        const diff = new Date(ledger.expiryDate) - now;
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      return {
        billId: bill._id,
        total: bill.total || bill.totalAmount || 0,
        earned,
        redeemed,
        createdAt: bill.createdAt,
        transactionDate: bill.createdAt,
        pointsEarned: ledger?.points ?? earned,
	        expiryDate: ledger?.expiryDate || null,
	        daysLeft,
	        phone: bill.phone || bill.customerPhone || customer.phone || customer.fullNumber || "Walk-in",
        items: items.map((i) => ({
          itemId: i.itemId ? String(i.itemId) : "",
          name: i.name,
          qty: Number(i.qty || 0),
          price: Number(i.price || 0),
          total: Number(i.total || i.price || 0),
          nodePath: i.nodePath || [],
          resourceName: i.resourceName || "",
        })),
      };
    });

    const totalSpend = billsRaw.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    );
    const totalVisits = billsRaw.length;
    const avgBill = totalVisits ? Math.round(totalSpend / totalVisits) : 0;
    const lastVisit = billsRaw[0]?.createdAt || null;

    const now = new Date();
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 7);

    const loyaltyAgg = await LoyaltyLedger.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          customerId: customer._id,
        },
      },
      {
        $group: {
          _id: null,
          earned: {
            $sum: {
              $cond: [{ $eq: ["$type", "EARN"] }, "$points", 0],
            },
          },
          redeemed: {
            $sum: {
              $cond: [
                { $eq: ["$type", "REDEEM"] },
                { $abs: "$points" },
                0,
              ],
            },
          },
          balance: {
            $sum: {
              $cond: [{ $eq: ["$type", "EARN"] }, "$remainingPoints", 0],
            },
          },
          availablePoints: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "EARN"] },
                    { $gt: ["$remainingPoints", 0] },
                    {
                      $or: [
                        { $eq: ["$expiryDate", null] },
                        { $gte: ["$expiryDate", now] },
                      ],
                    },
                  ],
                },
                "$remainingPoints",
                0,
              ],
            },
          },
          expiredPoints: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "EARN"] },
                    { $gt: ["$remainingPoints", 0] },
                    { $lt: ["$expiryDate", now] },
                  ],
                },
                "$remainingPoints",
                0,
              ],
            },
          },
          expiringSoonPoints: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "EARN"] },
                    { $gt: ["$remainingPoints", 0] },
                    { $gte: ["$expiryDate", now] },
                    { $lte: ["$expiryDate", soonDate] },
                  ],
                },
                "$remainingPoints",
                0,
              ],
            },
          },
        },
      },
    ]);

    const loyaltyRow = loyaltyAgg?.[0] || {};

    const expiringPoints = await LoyaltyLedger.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          customerId: customer._id,
          type: "EARN",
          remainingPoints: { $gt: 0 },
          expiryDate: { $gt: now },
        },
      },
      {
        $project: {
          _id: 0,
          expiryDate: 1,
          remainingPoints: 1,
          daysLeft: {
            $ceil: {
              $divide: [{ $subtract: ["$expiryDate", now] }, 86400000],
            },
          },
        },
      },
      { $sort: { expiryDate: 1 } },
    ]);

    const retentionAgg = await BillingSession.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: "COMPLETED",
        },
      },
      {
        $group: {
          _id: "$customerId",
          visits: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          returningCustomers: {
            $sum: {
              $cond: [{ $gt: ["$visits", 1] }, 1, 0],
            },
          },
        },
      },
    ]);

    const retentionRow = retentionAgg?.[0] || {};
    const totalCustomers = retentionRow.totalCustomers || 0;
    const returningCustomers = retentionRow.returningCustomers || 0;
    const retentionScore = totalCustomers
      ? Math.round((returningCustomers / totalCustomers) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        customer: {
          phone: customer.phone || customer.fullNumber || phone,
          totalVisits,
          totalSpend,
          avgBill,
          lastVisit,
        },
        loyalty: {
          earned: loyaltyRow.earned || 0,
          redeemed: loyaltyRow.redeemed || 0,
          balance: loyaltyRow.balance || 0,
          availablePoints: loyaltyRow.availablePoints || 0,
          expiredPoints: loyaltyRow.expiredPoints || 0,
          expiringSoonPoints: loyaltyRow.expiringSoonPoints || 0,
          expiringPoints,
        },
        retention: {
          totalCustomers,
          returningCustomers,
          retentionScore,
        },
        bills,
      },
    });
  } catch (err) {
    console.error("getVendorCustomer error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
