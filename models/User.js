const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'] },
  phone: { type: String },
  role: { type: String, enum: ['donor', 'normal'], default: 'donor' },
  bloodGroup: { type: String },
  location: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  profilePicture: { type: String },
  lastDonationDate: { type: Date },
  // CNIC: 13-digit national identity card number (stored as string to preserve leading zeros)
  cnic: { type: String },
  // Blood Report: base64-encoded image/document uploaded by the donor during registration
  bloodReport: { type: String },
  resetPasswordOTP: { type: String },
  resetPasswordExpires: { type: Date },
  // GeoJSON for high-performance location searches
  locationPoint: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [73.0479, 33.6844] } // [longitude, latitude]
  }
}, { timestamps: true });

userSchema.index({ locationPoint: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
