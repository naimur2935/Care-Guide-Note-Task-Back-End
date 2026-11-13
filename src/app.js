const express = require('express');
const cors = require('cors');
const { asyncHandler } = require('./utils/helpers');
const connectDatabase = require('./utils/connectDatabase');

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/health', asyncHandler(async (req, res) => {
  await connectDatabase();
  res.json({ status: 'ok', database: 'connected' });
}));
app.use('/api', asyncHandler(async (req, res, next) => {
  await connectDatabase();
  next();
}));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'Email already in use' });
  if (err.code === 'MONGO_URI_MISSING') {
    return res.status(503).json({ message: 'Database configuration is missing. Set MONGO_URI.' });
  }
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
    console.error('MongoDB unavailable:', err.message);
    return res.status(503).json({ message: 'Database unavailable. Check MongoDB connectivity and network access.' });
  }
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
