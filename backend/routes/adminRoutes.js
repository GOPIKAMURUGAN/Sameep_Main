const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const { requireAdminAuth } = require("../utils/adminAuthMiddleware");
const {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");
const {
  assignVendorPlan,
  getVendorSubscription,
  updateVendorSubscription,
} = require("../controllers/vendorSubscriptionController");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await AdminUser.findOne({ email }).lean();
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id.toString(), email: admin.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/login error:", err.message || err);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", requireAdminAuth, async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.admin.id).lean();
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json({
      id: admin._id.toString(),
      email: admin.email,
      createdAt: admin.createdAt,
    });
  } catch (err) {
    console.error("GET /api/admin/me error:", err.message || err);
    return res.status(500).json({ message: "Failed to load admin" });
  }
});

router.get("/plans", getPlans);
router.post("/plans", createPlan);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

router.post("/vendor-subscriptions", assignVendorPlan);
router.get("/vendor-subscriptions/:vendorId", getVendorSubscription);
router.put("/vendor-subscriptions/:vendorId", updateVendorSubscription);

module.exports = router;
