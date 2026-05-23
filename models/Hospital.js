const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  website: { type: String },
  location: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  profilePicture: { type: String },
  resetPasswordOTP: { type: String },
  resetPasswordExpires: { type: Date },
  // GeoJSON for high-performance location searches
  locationPoint: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [73.0479, 33.6844] } // [longitude, latitude]
  }
}, { timestamps: true });

hospitalSchema.index({ locationPoint: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
