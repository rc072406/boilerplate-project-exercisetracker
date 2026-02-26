const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// 1. Middleware & Configuration
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Parses form data
app.use(express.json()); // Parses JSON data


mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});


const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);




app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const user = await newUser.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: "Could not create user" });
  }
});


app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('username _id');
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.send("Could not find user");

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date()
    });

    const exercise = await exerciseObj.save();
    
   
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString()
    });
  } catch (err) {
    res.status(500).send("Error saving exercise");
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) return res.send("Could not find user");

  
    let dateFilter = {};
    if (from) dateFilter["$gte"] = new Date(from);
    if (to) dateFilter["$lte"] = new Date(to);

    let filter = { user_id: id };
    if (from || to) filter.date = dateFilter;

    const exercises = await Exercise.find(filter).limit(+limit || 500);

    // Format the log array to match the required output
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (err) {
    res.status(500).send("Error retrieving logs");
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
