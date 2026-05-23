require('dotenv').config();
const mongoose = require('mongoose');
const BloodRequest = require('./models/BloodRequest');
const Hospital = require('./models/Hospital');
const sendEmail = require('./utils/emailService');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    // Find a hospital to act as the requester
    const requester = await Hospital.findOne();
    if (!requester) {
        console.log("No hospital found in DB");
        return;
    }

    // Find nearby hospitals (simulating the logic)
    const nearbyHospitals = await Hospital.find({
        _id: { $ne: requester._id }
    }).limit(2);

    console.log(`Found ${nearbyHospitals.length} nearby hospitals`);

    for (const h of nearbyHospitals) {
        console.log(`Attempting to send email to ${h.email}...`);
        try {
            await sendEmail({
                email: h.email,
                subject: 'DEBUG: Blood Request',
                message: 'This is a debug test.'
            });
            console.log(`Email sent to ${h.email}`);
        } catch (err) {
            console.error(`FAILED to send email to ${h.email}:`, err);
        }
    }

    mongoose.disconnect();
}

debug();
