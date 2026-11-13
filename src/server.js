if (!process.env.VERCEL) {
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
}
require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./utils/connectDatabase');

const PORT = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
