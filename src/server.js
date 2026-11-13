require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./utils/connectDatabase');
const seedDemo = require('./scripts/seedDemo');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDatabase();
  console.log('MongoDB connected');

  try {
    const result = await seedDemo({ skipIfNoTarget: true });
    if (result.skipped) {
      console.warn('Demo seed skipped: set DEMO_EMAIL to an existing account to enable it.');
    } else {
      console.log(`Demo seed ready: added ${result.added} notes; ${result.alreadyExisted} already existed.`);
    }
  } catch (error) {
    console.error('Demo seed failed; server will continue without seeded notes:', error.message);
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch((err) => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});
