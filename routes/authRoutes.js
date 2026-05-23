const express = require('express');
const router = express.Router();
const { registerUser, registerHospital, login, getMe, updateProfile, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-user', registerUser);
router.post('/register-hospital', registerHospital);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Password Reset Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// New route for hospitals to view donor blood report
const { getDonorBloodReport } = require('../controllers/authController');
router.get('/donor/:id/blood-report', protect, getDonorBloodReport);

module.exports = router;
