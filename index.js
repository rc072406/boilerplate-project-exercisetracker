require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();


app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));


const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Utility: clean FCC test users
async function cleanFCCData() {
  try {
    const testUsers = await User.find({ username: /^fcc_test_/ });
    const ids = testUsers.map(u => u._id);
    if (ids.length > 0) {
      await Exercise.deleteMany({ userId: { $in: ids.map(String) } });
      await User.deleteMany({ _id: { $in: ids } });
      console.log(`Cleaned ${ids.length} FCC test user(s) and related exercises`);
    }
  } catch (err) {
    console.error('Error cleaning FCC data:', err);
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }
    res.json({ username: user.username, _id: user._id });
    if (username.startsWith('fcc_test_')) {
      setTimeout(cleanFCCData, 2000);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = await Exercise.create({
      userId: user._id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date()
    });

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });

    if (user.username.startsWith('fcc_test_')) {
      setTimeout(cleanFCCData, 2000);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId: user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select('-_id description duration date').sort({ date: 1 });
    if (limit) query = query.limit(Number(limit));
    const exercises = await query.exec();

    res.json({
      username: user.username,
      _id: user._id,
      count: exercises.length,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const listener = app.listen(3000, () => {
  console.log('Listening on port 3000');
});
