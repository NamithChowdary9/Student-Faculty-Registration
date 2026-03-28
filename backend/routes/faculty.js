const express = require('express');
const router  = express.Router();
const Faculty = require('../models/Faculty');
const auth    = require('../middleware/authMiddleware');

// GET faculty
router.get('/', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    let filter = {};
    if (department) filter.department = department;
    if (year)       filter.year       = year;
    if (semester)   filter.semester   = semester;
    const list = await Faculty.find(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD faculty
router.post('/', auth, async (req, res) => {
  try {
    const { name, department, year, semester, subject } = req.body;
    const duplicate = await Faculty.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      department, year, semester, subject
    });
    if (duplicate) {
      return res.status(400).json({ message: 'Faculty already exists for this subject' });
    }
    const faculty = await new Faculty(req.body).save();
    res.json({ message: 'Faculty added successfully', faculty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// EDIT faculty
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Faculty.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json({ message: 'Faculty updated successfully', updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE faculty
router.delete('/:id', auth, async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;