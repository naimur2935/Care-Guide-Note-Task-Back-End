const router = require('express').Router();
const User = require('../models/User');
const Note = require('../models/Note');
const Post = require('../models/Post');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler, paginate, pageResult } = require('../utils/helpers');

router.use(auth);

// SCENARIO 1: users grouped by interests -> exactly ONE User.aggregate() call.
// Optional ?interest=chess filter lets the $match use the interests index.
router.get('/grouped-by-interests', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const interest = req.query.interest ? String(req.query.interest) : null;

  const groups = await User.aggregate([
    { $match: interest ? { interests: interest } : { interests: { $exists: true } } },
    { $unwind: '$interests' },
    ...(interest ? [{ $match: { interests: interest } }] : []),
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
      },
    },
    { $sort: { _id: 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);
  res.json({ data: groups, page, limit });
}));

// ---- Admin only below ----
router.use(authorize('admin'));

router.get('/', asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const [data, total] = await Promise.all([
    User.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit).lean(),
    User.countDocuments(),
  ]);
  res.json(pageResult(data, total, p));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, role, interests } = req.body;
  const user = await User.create({ name, email, password, role, interests: interests || [] });
  const { password: _pw, ...safe } = user.toObject();
  res.status(201).json(safe);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  ['name', 'email', 'role', 'interests', 'password'].forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  await user.save();
  const { password: _pw, ...safe } = user.toObject();
  res.json(safe);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete yourself' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await Promise.all([Note.deleteMany({ userId: user._id }), Post.deleteMany({ userId: user._id })]);
  res.json({ message: 'User and related data deleted' });
}));

module.exports = router;
