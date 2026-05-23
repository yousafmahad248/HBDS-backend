require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const BloodRequest = require('./models/BloodRequest');
const sendEmail = require('./utils/emailService');
const { createNotification } = require('./controllers/notificationController');

async function testFlow() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const hospitalId = "69d21705ef67bfa4bfe86fba"; // PIMS
    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        console.log("Requester Hospital not found");
        return;
    }

    console.log(`Requester: ${hospital.hospitalName} at [${hospital.longitude}, ${hospital.latitude}]`);

    const nearbyHospitals = await Hospital.find({
        _id: { $ne: hospitalId },
        locationPoint: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [hospital.longitude || 73.0479, hospital.latitude || 33.6844]
                },
                $maxDistance: 15000
            }
        }
    });

    console.log(`Found ${nearbyHospitals.length} nearby hospitals`);

    for (const h of nearbyHospitals) {
        console.log(`Sending email to ${h.email}...`);
        try {
            await sendEmail({
                email: h.email,
                subject: 'URGENT: Blood Request from Nearby Hospital',
                message: `${hospital.hospitalName} is urgently requesting blood.`,
                html: `<h3>Urgent Blood Request</h3><p>${hospital.hospitalName} is requesting blood.</p>`
            });
            console.log(`SUCCESS: Email sent to ${h.email}`);
        } catch (err) {
            console.error(`FAILED: Email to ${h.email}:`, err);
        }
    }

    mongoose.disconnect();
}

testFlow();
