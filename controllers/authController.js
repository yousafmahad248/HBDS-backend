const User = require('../models/User');
const Hospital = require('../models/Hospital');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailService');
const { getWelcomeTemplate } = require('../utils/emailTemplates');
const { createNotification } = require('./notificationController');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, gender, role, bloodGroup, location, latitude, longitude, phone, profilePicture, cnic, bloodReport } = req.body;
        
        const userExists = await User.findOne({ email });
        const hospitalExists = await Hospital.findOne({ email });
        if (userExists || hospitalExists) return res.status(400).json({ msg: 'Email already in use' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = await User.create({
            name, email, password: hashedPassword, gender, role: role || 'donor', bloodGroup, location, latitude, longitude, phone, profilePicture, cnic, bloodReport,
            locationPoint: {
                type: 'Point',
                coordinates: [longitude || 73.0479, latitude || 33.6844]
            }
        });
        
        res.status(201).json({
            token: generateToken(user._id, user.role),
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            msg: 'Registration successful'
        });

        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to HBDS!',
                message: `Welcome to HBDS, ${user.name}! Thank you for joining our mission to save lives.`,
                html: getWelcomeTemplate(user.name, user.role)
            });
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
        }

        // Create Welcome Notification
        await createNotification({
            recipient: user._id,
            recipientModel: 'User',
            title: 'Welcome to HBDS!',
            message: `Hello ${user.name}, welcome to HBDS! You can now view blood requests nearby.`,
            type: 'SYSTEM'
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.registerHospital = async (req, res) => {
    try {
        const { hospitalName, email, password, address, latitude, longitude, phone, website, profilePicture } = req.body;
        
        const hospitalExists = await Hospital.findOne({ email });
        const userExists = await User.findOne({ email });
        if (hospitalExists || userExists) return res.status(400).json({ msg: 'Email already in use' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const hospital = await Hospital.create({
            hospitalName, 
            email, 
            password: hashedPassword, 
            location: address, 
            latitude, 
            longitude,
            phone,
            website,
            profilePicture,
            locationPoint: {
                type: 'Point',
                coordinates: [longitude || 73.0479, latitude || 33.6844]
            }
        });
        
        res.status(201).json({
            token: generateToken(hospital._id, 'hospital'),
            hospital: { id: hospital._id, hospitalName: hospital.hospitalName, email: hospital.email },
            msg: 'Hospital registration successful'
        });

        // Send Welcome Email
        try {
            await sendEmail({
                email: hospital.email,
                subject: 'Welcome to HBDS!',
                message: `Welcome to HBDS, ${hospital.hospitalName}! Thank you for registering your hospital.`,
                html: getWelcomeTemplate(hospital.hospitalName, 'hospital')
            });
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
        }

        // Create Welcome Notification
        await createNotification({
            recipient: hospital._id,
            recipientModel: 'Hospital',
            title: 'Welcome to HBDS!',
            message: `Welcome to HBDS, ${hospital.hospitalName}! You can now post blood requests.`,
            type: 'SYSTEM'
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        let account;
        let authRole;
        if (role === 'hospital') {
            account = await Hospital.findOne({ email });
            authRole = 'hospital';
        } else {
            account = await User.findOne({ email });
            authRole = account ? account.role : 'donor';
        }
        
        if (!account) return res.status(400).json({ msg: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
        
        res.json({
            token: generateToken(account._id, authRole),
            role: authRole,
            msg: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const { id, role } = req.user; // set by authMiddleware
        
        if (role === 'hospital') {
            const hospital = await Hospital.findById(id).select('-password');
            if (!hospital) return res.status(404).json({ msg: 'Hospital not found' });
            res.json(hospital);
        } else {
            const user = await User.findById(id).select('-password');
            if (!user) return res.status(404).json({ msg: 'User not found' });
            res.json(user);
        }
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, hospitalName, email, phone, bloodGroup, location, latitude, longitude, profilePicture, password, website, cnic, bloodReport } = req.body;
        const userId = req.user.id;
        
        if (req.user.role === 'hospital') {
            const hospital = await Hospital.findById(userId);
            if (!hospital) return res.status(404).json({ msg: 'Hospital not found' });
            
            if (hospitalName) hospital.hospitalName = hospitalName;
            
            if (email && email !== hospital.email) {
                const existingHospital = await Hospital.findOne({ email });
                const existingUser = await User.findOne({ email });
                if (existingHospital || existingUser) {
                    return res.status(400).json({ msg: 'Email already in use' });
                }
                hospital.email = email;
            }

            if (phone) hospital.phone = phone;
            if (location) hospital.location = location;
            if (latitude !== undefined) hospital.latitude = latitude;
            if (longitude !== undefined) hospital.longitude = longitude;
            
            // Sync GeoJSON locationPoint
            if (latitude !== undefined && longitude !== undefined) {
                hospital.locationPoint = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                };
            }

            if (website) hospital.website = website;
            if (profilePicture) hospital.profilePicture = profilePicture;
            
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hospital.password = await bcrypt.hash(password, salt);
            }
            
            await hospital.save();
            return res.json({
                msg: 'Profile updated successfully',
                user: { id: hospital._id, hospitalName: hospital.hospitalName, email: hospital.email, role: 'hospital', phone: hospital.phone, location: hospital.location, website: hospital.website, profilePicture: hospital.profilePicture }
            });
        } else {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ msg: 'User not found' });
            
            if (name) user.name = name;
            
            if (email && email !== user.email) {
                const existingHospital = await Hospital.findOne({ email });
                const existingUser = await User.findOne({ email });
                if (existingHospital || existingUser) {
                    return res.status(400).json({ msg: 'Email already in use' });
                }
                user.email = email;
            }

            if (phone) user.phone = phone;
            if (bloodGroup) user.bloodGroup = bloodGroup;
            if (location) user.location = location;
            if (latitude !== undefined) user.latitude = latitude;
            if (longitude !== undefined) user.longitude = longitude;
            
            // Sync GeoJSON locationPoint
            if (latitude !== undefined && longitude !== undefined) {
                user.locationPoint = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                };
            }

            if (profilePicture) user.profilePicture = profilePicture;
            if (cnic) user.cnic = cnic;
            if (bloodReport) user.bloodReport = bloodReport;
            
            if (password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
            }
            
            await user.save();
            return res.json({
                msg: 'Profile updated successfully',
                user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, bloodGroup: user.bloodGroup, location: user.location, latitude: user.latitude, longitude: user.longitude, profilePicture: user.profilePicture }
            });
        }
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email, role } = req.body;
        let account;
        if (role === 'hospital') {
            account = await Hospital.findOne({ email });
        } else {
            account = await User.findOne({ email });
        }

        if (!account) {
            return res.status(404).json({ msg: 'No account with that email address exists.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        account.resetPasswordOTP = otp;
        account.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        await account.save();

        const message = `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`;
        
        try {
            await sendEmail({
                email: account.email,
                subject: 'Password Reset OTP',
                message,
                html: `<h3>Password Reset Request</h3><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`
            });
            res.status(200).json({ msg: 'OTP sent to email.' });
        } catch (err) {
            console.error('\n==== NODEMAILER ERROR ====\n', err, '\n==========================\n');
            account.resetPasswordOTP = undefined;
            account.resetPasswordExpires = undefined;
            await account.save();
            return res.status(500).json({ msg: 'Email could not be sent', error: err.message });
        }
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, role } = req.body;
        let account;
        if (role === 'hospital') {
            account = await Hospital.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        } else {
            account = await User.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        }

        if (!account) {
            return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        }

        res.status(200).json({ msg: 'OTP verified successfully.' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, role } = req.body;
        let account;
        if (role === 'hospital') {
            account = await Hospital.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        } else {
            account = await User.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        }

        if (!account) {
            return res.status(400).json({ msg: 'Invalid or expired OTP.' });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(newPassword, salt);
        
        // Clear OTP fields
        account.resetPasswordOTP = undefined;
        account.resetPasswordExpires = undefined;

        await account.save();

        res.status(200).json({ msg: 'Password reset successful.' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// New controller to get donor blood report (for hospital access)
exports.getDonorBloodReport = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure the requester is a hospital
        if (req.user.role !== 'hospital') {
            return res.status(403).json({ msg: 'Access denied. Only hospitals can view blood reports.' });
        }
        
        const donor = await User.findById(id).select('name bloodReport');
        if (!donor) return res.status(404).json({ msg: 'Donor not found' });
        
        if (!donor.bloodReport) {
            return res.status(404).json({ msg: 'No blood report found for this donor' });
        }
        
        res.json({
            name: donor.name,
            bloodReport: donor.bloodReport
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};
