const router = require('express').Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler, paginate, pageResult } = require('../utils/helpers');

// Public: all posts (paginated)
router.get('/', asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const [data, total] = await Promise.all([
    Post.find().sort({ _id: -1 }).skip(p.skip).limit(p.limit).populate('userId', 'name').lean(),
    Post.countDocuments(),
  ]);
  res.json(pageResult(data, total, p));
}));

// SCENARIO 2: all posts of one user -> ONE aggregation pipeline with $lookup. Public.
router.get('/user/:userId', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const { page, limit, skip } = paginate(req.query);
  const uid = new mongoose.Types.ObjectId(req.params.userId);

  const [result] = await User.aggregate([
    { $match: { _id: uid } }, // _id index
    {
      $lookup: {
        from: 'posts',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$uid'] } } }, // posts {userId, createdAt} index
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        as: 'posts',
      },
    },
    { $project: { name: 1, posts: 1 } },
  ]);

  if (!result) return res.status(404).json({ message: 'User not found' });
  res.json({ user: { _id: result._id, name: result.name }, page, limit, posts: result.posts });
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  const post = await Post.create({ userId: req.user._id, title, body });
  res.status(201).json(post);
}));

module.exports = router;
