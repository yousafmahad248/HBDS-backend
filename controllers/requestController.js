const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { getDistance } = require('geolib');
const sendEmail = require('../utils/emailService');
const { createNotification } = require('./notificationController');

exports.createRequest = async (req, res) => {
    try {
        const { patientName, bloodGroup, units, urgency, description } = req.body;
        const hospitalId = req.user.id;

        if (req.user.role !== 'hospital') {
            return res.status(403).json({ msg: 'Only hospitals can create blood requests' });
        }

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ msg: 'Hospital not found' });
        }

        // Find nearby hospitals within 15km using MongoDB Geospatial search (High Performance)
        const nearbyHospitals = await Hospital.find({
            _id: { $ne: hospitalId },
            locationPoint: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [hospital.longitude || 73.0479, hospital.latitude || 33.6844]
                    },
                    $maxDistance: 15000 // 15 km in meters
                }
            }
        });
        
        console.log(`Found ${nearbyHospitals.length} nearby hospitals for request from ${hospital.hospitalName}`);

        const alertedHospitals = nearbyHospitals.map(h => ({ 
            hospitalId: h._id, 
            status: 'Pending' 
        }));

        const newRequest = await BloodRequest.create({
            hospitalId,
            hospitalName: hospital.hospitalName,
            location: hospital.location || 'Unknown Location',
            latitude: hospital.latitude,
            longitude: hospital.longitude,
            patientName,
            bloodGroup,
            units,
            urgency: urgency || 'Normal',
            description,
            targetAudience: 'Hospitals',
            alertedHospitals,
            status: 'Open'
        });

        res.status(201).json(newRequest);

        // Process emails and notifications in background so the user doesn't wait
        setTimeout(async () => {
            for (const h of nearbyHospitals) {
                if (!h.email) {
                    console.warn(`Hospital ${h.hospitalName} has no email address. Skipping email alert.`);
                } else {
                    sendEmail({
                        email: h.email,
                        subject: 'URGENT: Blood Request from Nearby Hospital',
                        message: `${hospital.hospitalName} is urgently requesting ${units} units of ${bloodGroup} blood. Please log into the app to accept or decline this request.`
                    }).catch(err => {
                        console.error(`FAILED to send email to hospital ${h.email}:`, err);
                    });
                }

                // Create in-app notification
                createNotification({
                    recipient: h._id,
                    recipientModel: 'Hospital',
                    title: 'New Blood Request Nearby',
                    message: `${hospital.hospitalName} is requesting ${units} units of ${bloodGroup} blood.`,
                    type: 'BLOOD_REQUEST',
                    relatedId: newRequest._id
                }).catch(err => console.error('Notification error:', err));
            }
        }, 0);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const filters = { status: 'Open' };
        
        if (req.query.bloodGroup) {
            filters.bloodGroup = req.query.bloodGroup;
        }

        if (req.user.role === 'hospital') {
            filters.targetAudience = 'Hospitals';
            // Optional: further filter by requests where this hospital is the creator OR in alertedHospitals array
            filters.$or = [
                { hospitalId: req.user.id },
                { 'alertedHospitals.hospitalId': req.user.id, 'alertedHospitals.status': 'Pending' }
            ];
        } else {
            filters.targetAudience = 'Donors';
        }

        const requests = await BloodRequest.find(filters).sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.getMyRequests = async (req, res) => {
    try {
        const requests = await BloodRequest.find({ hospitalId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('acceptedBy', 'name phone email location cnic bloodReport');
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await BloodRequest.findById(requestId);
        
        if (!request) return res.status(404).json({ msg: 'Request not found' });

        if (req.user.role !== 'hospital') {
            const donor = await User.findById(req.user.id);
            if (donor) {
                if (donor.lastDonationDate) {
                    const diffTime = new Date().getTime() - new Date(donor.lastDonationDate).getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 90) {
                        const remainingDays = 90 - diffDays;
                        return res.status(400).json({ 
                            msg: 'You cannot donate blood for 3 months', 
                            remainingDays 
                        });
                    }
                }
                donor.lastDonationDate = new Date();
                await donor.save();
            }
        }
        
        request.status = 'Fulfilled';
        request.acceptedBy = req.user.id;
        await request.save();

        res.status(200).json({ msg: 'Request accepted successfully.' });

        // Process in background
        setTimeout(async () => {
            // Notify the hospital that created the request
            const requesterHospital = await Hospital.findById(request.hospitalId);

            if (requesterHospital) {
                if (req.user.role === 'hospital') {
                    const acceptorHospital = await Hospital.findById(req.user.id);
                    if (acceptorHospital) {
                        sendEmail({
                            email: requesterHospital.email,
                            subject: 'Blood Request Accepted!',
                            message: `Great news! ${acceptorHospital.hospitalName} has accepted your blood request for ${request.bloodGroup} (${request.units} units). Please coordinate with them for the transfer. You can contact them at: ${acceptorHospital.phone || 'their registered number'}.`
                        }).catch(err => console.log('Acceptance email error:', err));
                    }
                } else {
                    const acceptorDonor = await User.findById(req.user.id);
                    if (acceptorDonor) {
                        sendEmail({
                            email: requesterHospital.email,
                            subject: 'Blood Request Accepted by a Donor!',
                            message: `Great news! A donor named ${acceptorDonor.name} has accepted your blood request for ${request.bloodGroup} (${request.units} units).\n\nDonor Details:\nName: ${acceptorDonor.name}\nPhone: ${acceptorDonor.phone || 'Not provided'}\nEmail: ${acceptorDonor.email}\nLocation: ${acceptorDonor.location || 'Not provided'}\n\nPlease coordinate with them for the blood donation.`
                        }).catch(err => console.log('Acceptance email error:', err));

                        // Create in-app notification for the hospital
                        createNotification({
                            recipient: request.hospitalId,
                            recipientModel: 'Hospital',
                            title: 'Blood Request Accepted',
                            message: `A donor named ${acceptorDonor.name} has accepted your request for ${request.bloodGroup} blood.`,
                            type: 'REQUEST_ACCEPTED',
                            relatedId: request._id
                        }).catch(err => console.error('Notification error:', err));
                    }
                }
            }

            // Trigger notification to other parties
            notifyOtherParties(request, req.user.id);
        }, 0);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.declineRequest = async (req, res) => {
    try {
        if (req.user.role !== 'hospital') {
            return res.status(403).json({ msg: 'Only hospitals can decline hospital-targeted requests' });
        }

        const requestId = req.params.id;
        const request = await BloodRequest.findById(requestId);
        
        if (!request) return res.status(404).json({ msg: 'Request not found' });

        // Mark this hospital's status as Declined
        const alertedIndex = request.alertedHospitals.findIndex(a => a.hospitalId.toString() === req.user.id);
        if (alertedIndex > -1) {
            request.alertedHospitals[alertedIndex].status = 'Declined';
        }
        
        // Check if ALL alerted hospitals have declined
        const allDeclined = request.alertedHospitals.every(a => a.status === 'Declined');
        
        if (allDeclined && request.alertedHospitals.length > 0 && request.targetAudience === 'Hospitals') {
            request.targetAudience = 'Donors';
            // Escalate to donors
            await exports.escalateToDonors(request, 'decline');
        }

        await request.save();
        res.status(200).json({ msg: 'Request declined.' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Helper for escalating
exports.escalateToDonors = async (request, reason = 'timeout') => {
    // Find nearby donors using MongoDB Geospatial search
    const nearbyDonors = await User.find({
        role: 'donor',
        locationPoint: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [request.longitude || 73.0479, request.latitude || 33.6844]
                },
                $maxDistance: 15000
            }
        }
    });

    // Send emails
    for (const donor of nearbyDonors) {
        await sendEmail({
            email: donor.email,
            subject: 'URGENT: Blood Donation Needed Nearby',
            message: `${request.hospitalName} urgently requires ${request.units} units of ${request.bloodGroup} blood. Since no other hospitals could fulfill it, we are asking donors like you. Please check the app.`
        }).catch(err => console.log('Email send error:', err));

        // Create in-app notification for donors
        const reasonMsg = reason === 'decline' 
            ? 'Since other hospitals could not fulfill this request, we are asking donors like you.' 
            : 'This request has been pending at nearby hospitals for over 2 hours and is now open to donors.';

        await createNotification({
            recipient: donor._id,
            recipientModel: 'User',
            title: 'Urgent Blood Needed',
            message: `${request.hospitalName} urgently requires ${request.bloodGroup} blood. ${reasonMsg}`,
            type: 'REQUEST_ESCALATED',
            relatedId: request._id
        });
    }
};

exports.updateRequest = async (req, res) => {
    try {
        const { patientName, bloodGroup, units, urgency, description } = req.body;
        const request = await BloodRequest.findById(req.params.id);

        if (!request) return res.status(404).json({ msg: 'Request not found' });

        // Authorization check: Only the hospital that created the request can update it
        if (request.hospitalId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to update this request' });
        }

        request.patientName = patientName || request.patientName;
        request.bloodGroup = bloodGroup || request.bloodGroup;
        request.units = units || request.units;
        request.urgency = urgency || request.urgency;
        request.description = description || request.description;

        await request.save();
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.deleteRequest = async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);

        if (!request) return res.status(404).json({ msg: 'Request not found' });

        // Authorization check
        if (request.hospitalId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to delete this request' });
        }

        await BloodRequest.findByIdAndDelete(req.params.id);
        res.status(200).json({ msg: 'Request deleted successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Helper function to notify others that a donor is available
const notifyOtherParties = async (request, acceptorId) => {
    try {
        const recipients = [];

        // 1. Collect other alerted hospitals
        for (const alerted of request.alertedHospitals) {
            if (alerted.hospitalId.toString() !== acceptorId.toString()) {
                const h = await Hospital.findById(alerted.hospitalId);
                if (h) {
                    recipients.push({ email: h.email, id: h._id, model: 'Hospital' });
                }
            }
        }

        // 2. Collect nearby donors using Geospatial search
        const nearbyDonors = await User.find({
            role: 'donor',
            _id: { $ne: acceptorId },
            locationPoint: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [request.longitude || 73.0479, request.latitude || 33.6844]
                    },
                    $maxDistance: 15000
                }
            }
        });

        for (const d of nearbyDonors) {
            recipients.push({ email: d.email, id: d._id, model: 'User' });
        }

        // 3. Send update emails and in-app notifications to all unique recipients
        const uniqueRecipients = Array.from(new Set(recipients.map(r => r.id.toString())))
            .map(id => recipients.find(r => r.id.toString() === id));

        for (const recipient of uniqueRecipients) {
            // Send Email
            await sendEmail({
                email: recipient.email,
                subject: 'Update: Blood Request Fulfilled',
                message: `The blood request for ${request.bloodGroup} blood at ${request.hospitalName} has been successfully fulfilled. Thank you for your willingness to help! The request is now closed as a donor/hospital is available.`
            }).catch(err => console.log('Notification email error:', err));

            // Create In-App Notification
            await createNotification({
                recipient: recipient.id,
                recipientModel: recipient.model,
                title: 'Blood Request Fulfilled',
                message: `The request for ${request.bloodGroup} at ${request.hospitalName} has been fulfilled.`,
                type: 'SYSTEM',
                relatedId: request._id
            });
        }
    } catch (error) {
        console.error('Error in notifyOtherParties:', error);
    }
};
