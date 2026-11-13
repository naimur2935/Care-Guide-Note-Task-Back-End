const router = require('express').Router();
const Note = require('../models/Note');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler, paginate, pageResult } = require('../utils/helpers');

router.use(auth);

// Admin: everyone's notes (paginated). Must be before '/:id'
router.get('/all', authorize('admin'), asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const [data, total] = await Promise.all([
    Note.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit).populate('userId', 'name email').lean(),
    Note.countDocuments(),
  ]);
  res.json(pageResult(data, total, p));
}));

// My notes (paginated)
router.get('/', asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const filter = { userId: req.user._id };
  const [data, total] = await Promise.all([
    Note.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    Note.countDocuments(filter),
  ]);
  res.json(pageResult(data, total, p));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.create({ userId: req.user._id, title, content });
  res.status(201).json(note);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  const isOwner = note.userId.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  res.json(note);
}));

// Update/delete: owner only
router.put('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  await note.save();
  res.json(note);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json({ message: 'Note deleted' });
}));

module.exports = router;
