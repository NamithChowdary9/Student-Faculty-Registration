const mongoose = require("mongoose");

const selectionSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: Number, required: true },      // Changed to Number to match Faculty model
    semester: { type: Number, required: true },  // Changed to Number to match Faculty model
    selections: [
      {
        subject: String,
        facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
        facultyName: String,
        roomNumber: { type: String, default: "" },
      },
    ],
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One selection record per student per dept/year/sem
selectionSchema.index(
  { studentId: 1, department: 1, year: 1, semester: 1 },
  { unique: true }
);

module.exports = mongoose.model("Selection", selectionSchema);