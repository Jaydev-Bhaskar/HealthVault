const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const xss = require('xss');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Store OTPs temporarily (in production use Redis)
const otpStore = {};

// Register (email + password)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, aadhaarId, role, bloodGroup, age, specialty, hospital, licenseNumber, registrationNumber, labTypes, address } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        // Sanitize user-supplied string fields to prevent stored XSS
        const sanitize = (v) => (typeof v === 'string' ? xss(v) : v);
        const userData = { name: sanitize(name), email, password, phone: sanitize(phone), aadhaarId, role, bloodGroup, age };
        if (role === 'doctor') {
            userData.specialty = sanitize(specialty);
            userData.hospital = sanitize(hospital);
            userData.licenseNumber = sanitize(licenseNumber);
        }
        if (role === 'hospital') {
            userData.registrationNumber = sanitize(registrationNumber);
            userData.labTypes = labTypes || [];
            userData.address = sanitize(address);
        }
        const user = await User.create(userData);
        res.status(201).json({
            _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role,
            healthId: user.healthId, healthScore: user.healthScore, bloodGroup: user.bloodGroup,
            age: user.age, phone: user.phone, aadhaarId: user.aadhaarId,
            doctorCode: user.doctorCode, specialty: user.specialty, hospital: user.hospital,
            labCode: user.labCode, registrationNumber: user.registrationNumber, labTypes: user.labTypes,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login (email + password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role,
                healthId: user.healthId, healthScore: user.healthScore, bloodGroup: user.bloodGroup,
                age: user.age, phone: user.phone, aadhaarId: user.aadhaarId,
                allergies: user.allergies, chronicIllnesses: user.chronicIllnesses,
                currentMedications: user.currentMedications,
                doctorCode: user.doctorCode, specialty: user.specialty,
                labCode: user.labCode, registrationNumber: user.registrationNumber, labTypes: user.labTypes,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Aadhaar: Send OTP
router.post('/aadhaar/send-otp', async (req, res) => {
    try {
        const { aadhaarId } = req.body;
        if (!aadhaarId || aadhaarId.length !== 12) {
            return res.status(400).json({ message: 'Invalid Aadhaar number. Must be 12 digits.' });
        }
        // Generate a 6-digit OTP (In production: use Aadhaar UIDAI sandbox API)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[aadhaarId] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min expiry

        console.log(`📱 OTP for Aadhaar ${aadhaarId}: ${otp}`); // For demo: visible in console

        res.json({ message: `OTP sent to Aadhaar-linked mobile number`, aadhaarId, demoOtp: otp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Aadhaar: Verify OTP & Login/Register
router.post('/aadhaar/verify-otp', async (req, res) => {
    try {
        const { aadhaarId, otp, name, bloodGroup, age } = req.body;

        const storedOtp = otpStore[aadhaarId];
        if (!storedOtp) return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        if (Date.now() > storedOtp.expiresAt) {
            delete otpStore[aadhaarId];
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }
        if (storedOtp.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

        delete otpStore[aadhaarId]; // Clear used OTP

        // Find or create user by Aadhaar
        let user = await User.findOne({ aadhaarId });
        if (!user) {
            // New user — create account
            user = await User.create({
                name: name || `User-${aadhaarId.slice(-4)}`,
                email: `aadhaar_${aadhaarId}@healthvault.ai`,
                password: aadhaarId + '_secure_' + Date.now(),
                aadhaarId,
                bloodGroup: bloodGroup || '',
                age: age || 0,
                role: 'patient'
            });
        }

        res.json({
            _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role,
            healthId: user.healthId, healthScore: user.healthScore, bloodGroup: user.bloodGroup,
            age: user.age, aadhaarId: user.aadhaarId,
            allergies: user.allergies, chronicIllnesses: user.chronicIllnesses,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('familyMembers', 'name healthId bloodGroup age');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const fields = ['name', 'phone', 'bloodGroup', 'age', 'allergies', 'chronicIllnesses', 'currentMedications', 'emergencyContact'];
            fields.forEach(f => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
            const updatedUser = await user.save();
            res.json(updatedUser);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add family member
router.post('/family', protect, async (req, res) => {
    try {
        const { name, bloodGroup, age, email, password } = req.body;
        const familyMember = await User.create({
            name, email: email || `family_${Date.now()}@healthvault.ai`,
            password: password || 'family123', bloodGroup, age, role: 'patient'
        });
        const user = await User.findById(req.user._id);
        user.familyMembers.push(familyMember._id);
        await user.save();
        res.status(201).json(familyMember);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get family members
router.get('/family', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('familyMembers', 'name healthId bloodGroup age healthScore');
        res.json(user.familyMembers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search doctors by code or name
router.get('/doctors/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);
        const query = {
            role: 'doctor',
            $or: [
                { doctorCode: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } },
                { specialty: { $regex: q, $options: 'i' } },
                { hospital: { $regex: q, $options: 'i' } }
            ]
        };
        const doctors = await User.find(query).select('name doctorCode specialty hospital email').limit(10);
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search hospitals/labs by code or name
router.get('/hospitals/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);
        const query = {
            role: 'hospital',
            $or: [
                { labCode: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } },
                { address: { $regex: q, $options: 'i' } }
            ]
        };
        const hospitals = await User.find(query).select('name labCode labTypes address email registrationNumber').limit(10);
        res.json(hospitals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Search patient by Health ID (for hospitals to upload reports)
router.get('/patient/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 3) return res.status(400).json({ message: 'Please enter at least 3 characters.' });
        const patient = await User.findOne({
            role: 'patient',
            $or: [
                { healthId: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        }).select('name healthId bloodGroup age email');
        if (!patient) return res.status(404).json({ message: 'No patient found.' });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
