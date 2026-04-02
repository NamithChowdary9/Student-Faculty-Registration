const mongoose = require("mongoose");

/*
  Registration Number Format: 231FA04812
  Year prefix (Academic Year 2025-26):
    25xx → 1st Year (joined 2025)
    24xx → 2nd Year (joined 2024)
    23xx → 3rd Year (joined 2023)
    22xx → 4th Year (joined 2022)
*/

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "faculty", "student"],
      required: true,
    },
    department: {
      type: String,
      enum: ["CSE", "ECE", "MBA", "CS", ""],
      default: "",
    },
    yearOfStudy: { type: Number, default: null },
    sgpa: { type: Number, default: null },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);