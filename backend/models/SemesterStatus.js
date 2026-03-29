const mongoose = require("mongoose");

const semesterStatusSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    year:       { type: String, required: true },
    semester:   { type: String, required: true },
    isLocked:   { type: Boolean, default: true },
    lockedBy:   { type: String, default: "" },
    lockedAt:   { type: Date,   default: null },
    minSgpa:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

semesterStatusSchema.index(
  { department: 1, year: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model("SemesterStatus", semesterStatusSchema);