const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Public registration always creates a normal "user"
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, interests } = req.body;
  const user = await User.create({ name, email, password, interests: interests || [] });
  res.status(201).json({
    token: signToken(user),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  res.json({
    token: signToken(user),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user);
}));

module.exports = router;
