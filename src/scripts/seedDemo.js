require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');

const demoNotes = [
  ['A slower start', '<p>Leave the first ten minutes of the morning unscheduled. Make tea, open the window, and decide what matters most today.</p>'],
  ['Weekend market list', '<ul><li>Ripe tomatoes</li><li>Fresh basil</li><li>A loaf of sourdough</li><li>Something seasonal to try</li></ul>'],
  ['Project idea: reading nook', '<p>Use the quiet corner by the window. Add a warm floor lamp, one narrow shelf, and a comfortable chair.</p>'],
  ['Questions for the next check-in', '<ol><li>What is going well?</li><li>What feels stuck?</li><li>What is one useful next step?</li></ol>'],
  ['A recipe to remember', '<p>Roast chickpeas with cumin and smoked paprika. Serve with lemon yogurt, cucumber, and warm flatbread.</p>'],
  ['Books to borrow', '<p>Pick one short story collection and one book about gardens. Ask Sam for the title they mentioned last week.</p>'],
  ['Small things that helped', '<ul><li>A short walk after lunch</li><li>Putting the phone in another room</li><li>Writing tomorrow’s first task down</li></ul>'],
  ['Gift ideas', '<p>Look for a handmade ceramic mug or a small print from a local artist. Keep the wrapping simple.</p>'],
  ['Places for a day trip', '<p>Check the lakeside trail, the old railway town, and the botanical garden. Leave early and bring snacks.</p>'],
  ['Ideas for the balcony', '<p>Try mint in a separate pot, two hardy herbs, and a small outdoor light. Measure the railing before buying planters.</p>'],
  ['A useful reminder', '<p>When a task feels too large, write the smallest next action. Ten focused minutes still count as progress.</p>'],
  ['Playlist for focused work', '<p>Instrumental music, steady tempo, no lyrics. Keep the volume low enough to hear the room.</p>'],
  ['Things to ask the plumber', '<ol><li>Can the tap be repaired or should it be replaced?</li><li>How long will the part take to arrive?</li><li>Is there anything to do before the visit?</li></ol>'],
  ['A note on the new routine', '<p>The short evening reset is easier to keep than a full clean. Clear the desk, set out a notebook, and stop there.</p>'],
  ['Lunch combinations', '<p>Rice, roasted vegetables, and tahini. Or lentils with greens, lemon, and toasted seeds.</p>'],
  ['Ideas for the team retro', '<p>Keep, change, try. Give everyone a quiet minute to write before the discussion starts.</p>'],
  ['Garden observations', '<p>The west-facing pot dries out first. Move the seedlings a little farther from the wall and check them at dusk.</p>'],
  ['Useful keyboard shortcuts', '<ul><li>Search the current page before opening another tab</li><li>Use headings to make long notes easier to scan</li><li>Capture the thought first; organize it later</li></ul>'],
  ['Packing list for two nights', '<p>Weather layer, comfortable shoes, charger, water bottle, book, and the small notebook by the bed.</p>'],
  ['Month-end reflection', '<p>What felt meaningful? What took more energy than expected? What can be made simpler next month?</p>'],
];

async function seedDemo() {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI before seeding demo notes.');
  await mongoose.connect(process.env.MONGO_URI);

  const email = String(process.env.DEMO_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const user = email
    ? await User.findOne({ email }).select('_id email')
    : await User.findOne().sort({ _id: 1 }).select('_id email');

  if (!user) {
    throw new Error('No target user found. Register a user or seed the admin first, then set DEMO_EMAIL.');
  }

  const titles = demoNotes.map(([title]) => `Demo · ${title}`);
  const existing = await Note.find({ userId: user._id, title: { $in: titles } }).distinct('title');
  const existingTitles = new Set(existing);
  const createdAt = new Date();
  const newNotes = demoNotes
    .filter(([title]) => !existingTitles.has(`Demo · ${title}`))
    .map(([title, content], index) => ({
      userId: user._id,
      title: `Demo · ${title}`,
      content,
      createdAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
      updatedAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
    }));

  if (newNotes.length) await Note.insertMany(newNotes);
  console.log(`Demo seed complete for ${user.email}: added ${newNotes.length} notes; ${existingTitles.size} already existed.`);
}

seedDemo()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
