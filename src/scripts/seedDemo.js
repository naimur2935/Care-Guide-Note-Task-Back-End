require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const Post = require('../models/Post');
const connectDatabase = require('../utils/connectDatabase');

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

const demoPosts = [
  ['A small habit that made mornings easier', '<p>I started writing down one priority for the day before opening my inbox. It is a tiny change, but it helps me begin with intention instead of reacting to everything at once.</p>'],
  ['What is everyone reading lately?', '<p>I am looking for a thoughtful book for the evenings, ideally something easy to pick up for twenty minutes at a time. Share your recent favorite and what you enjoyed about it.</p>'],
  ['A simple weekend reset', '<p>My low-pressure reset is to tidy one small area, plan a couple of meals, and leave the rest of the weekend open. It feels more sustainable than trying to organize everything at once.</p>'],
  ['Favorite ways to take a screen break', '<p>A short walk, watering plants, or making tea helps me step away from a screen without turning a quick break into another task. What works for you?</p>'],
  ['Trying a new recipe this week', '<p>I am planning to make a one-pan meal with seasonal vegetables and a simple lemon dressing. I would love suggestions for spices or easy variations.</p>'],
  ['A reminder to celebrate small progress', '<p>Not every meaningful step looks impressive from the outside. Finishing a difficult email, asking for help, or taking a proper lunch break all count.</p>'],
  ['Share your favorite local place', '<p>Is there a quiet cafe, public garden, walking trail, or small shop you like visiting? I am collecting ideas for an unhurried afternoon out.</p>'],
  ['How do you organize project ideas?', '<p>I have been keeping one short list of ideas and adding a next action only when I am ready to explore one. It keeps interesting thoughts without making every idea feel like a commitment.</p>'],
  ['A playlist for focused work', '<p>Instrumental music with a steady tempo has been helping me settle into longer tasks. I am looking for calm recommendations that do not compete with reading or writing.</p>'],
  ['What makes a workspace feel welcoming?', '<p>For me it is good light, a clear place to write, and one personal object nearby. I am curious which small details make your workspace more comfortable.</p>'],
  ['A useful question for team check-ins', '<p>Instead of only asking what is finished, try asking what would make the next step easier. It can uncover small blockers before they turn into bigger ones.</p>'],
  ['Ideas for a screen-free evening', '<p>I am trying to keep one part of the evening free from scrolling. A puzzle, a familiar recipe, or a few pages of a book are all good options so far.</p>'],
  ['Learning something in small steps', '<p>Short practice sessions have been easier to maintain than waiting for a completely free afternoon. Ten focused minutes can be enough to build momentum.</p>'],
  ['What is one thing you are looking forward to?', '<p>It could be a meal, a visit with someone, a project milestone, or a quiet hour to yourself. Having one small thing on the calendar can brighten an ordinary week.</p>'],
  ['A gentle approach to planning', '<p>I am experimenting with choosing three priorities for the day and treating everything else as optional. It makes the plan feel more realistic and leaves room for surprises.</p>'],
  ['Share a tip for keeping notes useful', '<p>I find short, descriptive titles make old notes much easier to find. I am curious whether you organize yours by topic, date, project, or another way.</p>'],
  ['A favorite way to spend a rainy afternoon', '<p>Warm tea, a comfortable chair, and a book or a small creative project make rainy days feel like an invitation to slow down. What is your ideal rainy-day activity?</p>'],
  ['Making room for creative thinking', '<p>A few minutes away from the task often helps more than staring at the same screen. I like keeping a paper notebook nearby to capture ideas without opening another tab.</p>'],
  ['One thing worth simplifying', '<p>Sometimes a routine gets easier when one unnecessary step is removed. I am looking for small examples of things people have simplified at home or at work.</p>'],
  ['A monthly reflection prompt', '<p>What gave you energy this month, what would you like to do differently, and what is one thing you want to carry into the next month?</p>'],
];

async function seedDemo({ skipIfNoTarget = false } = {}) {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI before seeding demo data.');
  await connectDatabase();

  const email = String(process.env.DEMO_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const user = email
    ? await User.findOne({ email }).select('_id email')
    : await User.findOne().sort({ _id: 1 }).select('_id email');

  if (!user) {
    if (skipIfNoTarget) {
      return {
        skipped: true,
        addedNotes: 0,
        existingNotes: 0,
        addedPosts: 0,
        existingPosts: 0,
      };
    }
    throw new Error('No target user found. Register a user or seed the admin first, then set DEMO_EMAIL.');
  }

  const noteTitles = demoNotes.map(([title]) => `Demo · ${title}`);
  const existingNoteTitles = new Set(
    await Note.find({ userId: user._id, title: { $in: noteTitles } }).distinct('title'),
  );
  const postTitles = demoPosts.map(([title]) => `Demo · ${title}`);
  const existingPostTitles = new Set(
    await Post.find({ userId: user._id, title: { $in: postTitles } }).distinct('title'),
  );
  const createdAt = new Date();
  const newNotes = demoNotes
    .filter(([title]) => !existingNoteTitles.has(`Demo · ${title}`))
    .map(([title, content], index) => ({
      userId: user._id,
      title: `Demo · ${title}`,
      content,
      createdAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
      updatedAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
    }));
  const newPosts = demoPosts
    .filter(([title]) => !existingPostTitles.has(`Demo · ${title}`))
    .map(([title, body], index) => ({
      userId: user._id,
      title: `Demo · ${title}`,
      body,
      createdAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
      updatedAt: new Date(createdAt.getTime() - index * 60 * 60 * 1000),
    }));

  if (newNotes.length) await Note.insertMany(newNotes);
  if (newPosts.length) await Post.insertMany(newPosts);
  return {
    skipped: false,
    targetEmail: user.email,
    addedNotes: newNotes.length,
    existingNotes: existingNoteTitles.size,
    addedPosts: newPosts.length,
    existingPosts: existingPostTitles.size,
  };
}

module.exports = seedDemo;

if (require.main === module) {
  seedDemo()
    .then(({ targetEmail, addedNotes, existingNotes, addedPosts, existingPosts }) => {
      console.log(`Demo seed complete for ${targetEmail}: added ${addedNotes} notes and ${addedPosts} posts; ${existingNotes} notes and ${existingPosts} posts already existed.`);
    })
    .catch((error) => {
      console.error('Demo seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState) await mongoose.disconnect();
    });
}
