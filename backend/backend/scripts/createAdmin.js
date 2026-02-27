require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const connectDB = require("../config/db");
const AdminUser = require("../models/AdminUser");

// Hardcoded inputs
const ADMIN_EMAIL = "admin@ynot.business";
const ADMIN_PASSWORD = "YnotAdmin@Feb26";

async function main() {
  try {
    const email = String(ADMIN_EMAIL || "").trim().toLowerCase();
    const password = String(ADMIN_PASSWORD || "");

    if (!email || !password) {
      throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
    }

    await connectDB();

    const existing = await AdminUser.findOne({ email }).lean();
    if (existing) {
      console.log("Admin already exists:", email);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = new AdminUser({
      email,
      passwordHash,
    });

    await admin.save();

    console.log("Created admin:", email);
  } catch (err) {
    console.error("Failed to create admin:", err.message || err);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
}

main();
