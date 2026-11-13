const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    interests: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Hash password only when it is new or changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// INDEXES
// 1) Login + duplicate-email check + lookup by email
userSchema.index({ email: 1 }, { unique: true });
// 2) Interests aggregation ($match on interests before $unwind)
userSchema.index({ interests: 1 });
// Not needed: admin user list sorts by _id (default _id index), GET by id uses _id index.

module.exports = mongoose.model('User', userSchema);
