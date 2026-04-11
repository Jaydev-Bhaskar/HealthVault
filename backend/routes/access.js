const express = require('express');
const router = express.Router();
const AccessPermission = require('../models/AccessPermission');
const Medicine = require('../models/Medicine');
const { protect, requireRole } = require('../middleware/auth');
const QRCode = require('qrcode');
const User = require('../models/User');
const BlockchainService = require('../services/blockchain');

// Grant access to a doctor (PATIENT ONLY)
router.post('/grant', protect, requireRole('patient'), async (req, res) => {
    try {
        const { doctorCode, doctorId, doctorName, doctorSpecialty, hospital, accessType, expiresAt } = req.body;

        let doctor = null;
        // Try to find a real doctor by code
        if (doctorCode) {
            doctor = await User.findOne({ doctorCode, role: 'doctor' });
        } else if (doctorId) {
            doctor = await User.findById(doctorId);
        }

        const permission = await AccessPermission.create({
            patient: req.user._id,
            doctor: doctor ? doctor._id : undefined,
            doctorName: doctor ? doctor.name : (doctorName || 'Unknown Doctor'),
            doctorSpecialty: doctor ? doctor.specialty : (doctorSpecialty || ''),
            doctorCode: doctor ? doctor.doctorCode : (doctorCode || ''),
            hospital: doctor ? doctor.hospital : (hospital || ''),
            accessType: accessType || 'full',
            expiresAt
        });

        // Log to blockchain
        await BlockchainService.addBlock({
            action: 'ACCESS_GRANTED',
            patientId: req.user._id,
            actorId: doctor ? doctor._id : req.user._id,
            actorRole: 'patient',
            details: `Patient granted ${accessType || 'full'} access to Dr. ${doctor ? doctor.name : doctorName} (${doctorCode || 'manual'})`
        });

        res.status(201).json(permission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Grant access via QR code scan (DOCTOR / HOSPITAL ONLY)
router.post('/grant-by-scan', protect, async (req, res) => {
    try {
        const { healthId } = req.body;
        if (!healthId) return res.status(400).json({ message: 'healthId is required' });

        if (req.user.role !== 'doctor' && req.user.role !== 'hospital') {
            return res.status(403).json({ message: 'Only medical professionals can initiate access via scan' });
        }

        const patient = await User.findOne({ healthId, role: 'patient' });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const professional = await User.findById(req.user._id);

        let accessType = 'full';
        
        // Ensure no duplicate active permission exists
        const existing = await AccessPermission.findOne({ patient: patient._id, doctor: professional._id });
        if (existing) {
            existing.isActive = true;
            existing.accessType = accessType;
            await existing.save();
        } else {
            await AccessPermission.create({
                patient: patient._id,
                doctor: professional._id,
                doctorName: professional.name,
                doctorSpecialty: professional.specialty || professional.labTypes?.join(', ') || '',
                doctorCode: professional.doctorCode || professional.labCode || '',
                hospital: professional.hospital || professional.address || '',
                accessType: accessType,
                isActive: true
            });
        }

        // Log to blockchain
        await BlockchainService.addBlock({
            action: 'ACCESS_GRANTED_QR',
            patientId: patient._id,
            actorId: professional._id,
            actorRole: professional.role,
            details: `Patient granted ${accessType} access via Emergency QR Scan to ${professional.name}`
        });

        res.status(200).json({ message: 'Access granted successfully', patientId: patient._id });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all active permissions
router.get('/', protect, async (req, res) => {
    try {
        const permissions = await AccessPermission.find({ patient: req.user._id }).sort({ createdAt: -1 });
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle access (PATIENT ONLY)
router.put('/:id/toggle', protect, requireRole('patient'), async (req, res) => {
    try {
        const permission = await AccessPermission.findById(req.params.id);
        if (permission && permission.patient.toString() === req.user._id.toString()) {
            permission.isActive = !permission.isActive;
            permission.accessLog.push({
                action: permission.isActive ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED',
                timestamp: new Date()
            });
            await permission.save();

            // Log to blockchain
            await BlockchainService.addBlock({
                action: permission.isActive ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED',
                patientId: req.user._id,
                actorId: permission.doctor || req.user._id,
                actorRole: 'patient',
                details: `Access ${permission.isActive ? 'reactivated' : 'suspended'} for ${permission.doctorName} (${permission.doctorCode})`
            });

            res.json(permission);
        } else {
            res.status(404).json({ message: 'Permission not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Revoke access (PATIENT ONLY)
router.delete('/:id', protect, requireRole('patient'), async (req, res) => {
    try {
        const permission = await AccessPermission.findById(req.params.id);
        if (permission && permission.patient.toString() === req.user._id.toString()) {
            // Log to blockchain BEFORE deletion
            await BlockchainService.addBlock({
                action: 'ACCESS_REVOKED',
                patientId: req.user._id,
                actorId: permission.doctor || req.user._id,
                actorRole: 'patient',
                details: `Permanently revoked access for ${permission.doctorName} (${permission.doctorCode})`
            });

            await permission.deleteOne();
            res.json({ message: 'Access revoked' });
        } else {
            res.status(404).json({ message: 'Permission not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generate Emergency QR Code (with current active medicines)
router.get('/emergency-qr', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('name bloodGroup allergies chronicIllnesses currentMedications emergencyContact healthId');
        const activeMeds = await Medicine.find({ patient: req.user._id, isActive: true }).select('name dosage frequency');

        // Log emergency access to blockchain
        await BlockchainService.addBlock({
            action: 'EMERGENCY_ACCESS',
            patientId: req.user._id,
            actorId: req.user._id,
            actorRole: 'patient',
            details: 'Emergency QR code generated'
        });

        const emergencyData = {
            healthId: user.healthId,
            name: user.name,
            bloodGroup: user.bloodGroup,
            allergies: user.allergies,
            conditions: user.chronicIllnesses,
            medications: activeMeds.map(m => `${m.name} ${m.dosage}`),
            emergencyContact: user.emergencyContact,
            generatedAt: new Date().toISOString()
        };
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(emergencyData), {
            width: 400,
            margin: 2,
            color: { dark: '#1b6968', light: '#ffffff' }
        });
        res.json({ qrCode: qrDataUrl, data: emergencyData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

