const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  hospitalName: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  patientName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true },
  urgency: { type: String, enum: ['Critical', 'High', 'Normal'], default: 'Normal' },
  description: { type: String },
  status: { type: String, enum: ['Open', 'Fulfilled', 'Closed'], default: 'Open' },
  targetAudience: { type: String, enum: ['Hospitals', 'Donors'], default: 'Hospitals' },
  alertedHospitals: [{
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    status: { type: String, enum: ['Pending', 'Declined'], default: 'Pending' }
  }],
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
