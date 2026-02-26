const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// 1. Basic Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // Essential for parsing POST form data
app.use(express.json());

// 2. Database Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// 3. Schemas & Models
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

// 4. Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  const userObj = new User({
    username: req.body.username
  });

  try {
    const user = await userObj.save();
    res.json(user);
  } catch (err) {
    console.log(err);
    res.send("Error saving user");
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('username _id');
  res.json(users);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
