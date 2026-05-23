const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Hospital']
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['BLOOD_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_ESCALATED', 'SYSTEM'],
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // e.g. BloodRequest ID
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
