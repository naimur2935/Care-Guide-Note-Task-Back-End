const mongoose = require('mongoose');

let connectionPromise;

function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI is not configured.');
    error.code = 'MONGO_URI_MISSING';
    return Promise.reject(error);
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = connectDatabase;
