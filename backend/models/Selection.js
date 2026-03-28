const mongoose = require('mongoose');

const SelectionSchema = new mongoose.Schema({
  studentId:  { type: String, required: true },
  department: { type: String, required: true },
  year:       { type: String, required: true },
  semester:   { type: String, required: true },
  selections: [
    {
      subject:     String,
      facultyName: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Selection', SelectionSchema);