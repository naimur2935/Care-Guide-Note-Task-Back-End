const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

// INDEX: "my notes" list (filter by userId, newest first) + its count query
noteSchema.index({ userId: 1, createdAt: -1 });
// Not needed: admin "all notes" sorts by _id; GET /notes/:id uses _id index.

module.exports = mongoose.model('Note', noteSchema);
