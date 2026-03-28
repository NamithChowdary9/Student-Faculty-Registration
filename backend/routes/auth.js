const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    // 🔍 Validation
    if (!userId || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      userId,
      password: hashed,
      role
    });

    await newUser.save();

    res.json({ message: 'User created successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    // 🔍 Validation
    if (!userId || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ userId, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: user.role,
      userId: user.userId
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= DELETE USER =================
router.delete('/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const deletedUser = await User.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;