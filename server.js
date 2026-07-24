
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

// This explicitly mentions not to look into X-Forwarded-For header
// Since our set up doesn't include the reverse proxy we can get the client's ip from the request rather than looking into the X-Forwarded-For header
// But, if we use proxy like nginx, client's ip will always be the proxy's ip address which is what we do not want for logging
// in that case set the value to 1 to see the client's ip address in the header set by the reverse proxy.
// Please DO NOT set it to true since this will take the left most ip address in the field which the client can easily forge it (it is only a header so client can set any ip using tools like Burp)
app.set('trust proxy', false);

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





