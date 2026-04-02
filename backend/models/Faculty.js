const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    facultyId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs without this field
    },
    name: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    subject: { type: String, required: true },
    experience: { type: String, default: "" },
    rating: { type: Number, default: null },
    email: { type: String, default: "" },
    periodsPerWeek: { type: Number, default: 4 },
    studentLimit: { type: Number, default: 60 },
    enrolledCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faculty", facultySchema);