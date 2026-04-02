const mongoose = require("mongoose");

const semesterStatusSchema = new mongoose.Schema({
  department: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  isLocked: { type: Boolean, default: true },
  minSgpa: { type: Number, default: 0 },
  lockedBy: { type: String },
  lockedAt: { type: Date },
});

// Ensure unique combo of dept/year/sem
semesterStatusSchema.index(
  { department: 1, year: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model("SemesterStatus", semesterStatusSchema);