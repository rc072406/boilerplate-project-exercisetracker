require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Schemas
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1. Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const user = await newUser.save();
    res.json({
      username: user.username,
      _id: user._id
    });
  } catch (err) {
    res.json({ error: "Could not create user" });
  }
});

// 2. Get list of all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// 3. Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const id = req.params._id;

    const user = await User.findById(id);
    if (!user) return res.json({ error: "User not found" });

    // Fix: Better date handling for empty or null strings
    let exerciseDate = date ? new Date(date) : new Date();
    if (exerciseDate.toString() === 'Invalid Date') {
      exerciseDate = new Date();
    }

    const exercise = await Exercise.create({
      userId: id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    res.json({ error: "Internal Server Error" });
  }
});

// 4. Get logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const id = req.params._id;
    const user = await User.findById(id);
    
    if (!user) return res.json({ error: "User not found" });

    let filter = { userId: id };
    
    // Date filtering
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Fix: Explicitly cast limit to a number
    let exercises = await Exercise.find(filter).limit(+limit || 0);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id.toString(), // Fix: Ensure _id is sent as a string
      log: log
    });
  } catch (err) {
    res.json({ error: "Could not retrieve logs" });
  }
});

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
