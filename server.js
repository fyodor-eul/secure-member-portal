
// Importing mongoose, express and path modules
const mongoose = require('mongoose');
const express = require('express');
const path = require('path'); // managing system file directories

// Import dotenv to load `.env` file
require('dotenv').config()

// Import userRouter
const userRouter = require("./routes/userRouter");

// Creating Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Setting mongoose to use strict query
mongoose.set('strictQuery', true);
// Connecting our database
mongoose.connect(process.env.DB_CONNECT)
  .then(() => {
    console.log('MongoDB connected...');
  })

// Use express.json() to parse incoming request boides with JSON payloads.
app.use(express.json());

// Use express.urlencode() to parse incoming requiest boides with URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// Middleware to serve HTML files based on the URL path and to serve index.html as the default page
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

app.use('', userRouter);
// app.use(cors(corsOptions));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Click here to access http://localhost:${PORT}`);
});





