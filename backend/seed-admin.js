require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/facultysync";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    const exists = await User.findOne({ userId: "ADMIN001" });
    if (exists) {
      console.log("ℹ️  Admin user ADMIN001 already exists. Skipping.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      userId: "ADMIN001",
      password: hashedPassword,
      role: "admin",
      name: "System Administrator",
      email: "admin@facultysync.com",
      isActive: true,
    });

    console.log("✅ Admin user created successfully!");
    console.log("📝 Admin ID: ADMIN001");
    console.log("🔑 Password: admin123");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });