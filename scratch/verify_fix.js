const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing connection with URI from .env...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('SUCCESS: MongoDB connected using .env URI!');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: MongoDB connection error:', err);
    process.exit(1);
  });
