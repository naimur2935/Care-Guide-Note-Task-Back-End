require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.syncIndexes(); // make sure declared indexes exist
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin already exists');
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log('Admin created:', email);
  }
  await mongoose.disconnect();
})();
