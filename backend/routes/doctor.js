/**
 * Doctor-specific API routes
 * - View patients who granted them access
 * - View patient records (READ-ONLY, only if access is active)
 * - Add consultation notes
 * - View their own profile/stats
 */
const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const AccessPermission = require('../models/AccessPermission');
const HealthRecord = require('../models/HealthRecord');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const BlockchainService = require('../services/blockchain');
const simulationController = require('../controllers/doctorSimulationController');

// ── My Patients: patients who have granted this doctor access ──
router.get('/my-patients', protect, requireRole('doctor'), async (req, res) => {
    try {
        const permissions = await AccessPermission.find({
            doctor: req.user._id,
            isActive: true
        }).populate('patient', 'name healthId bloodGroup age email phone allergies chronicIllnesses healthScore');

        const patients = permissions.map(p => ({
            permissionId: p._id,
            accessType: p.accessType,
            grantedAt: p.grantedAt,
            expiresAt: p.expiresAt,
            patient: p.patient
        }));

        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── View specific patient's records (only if access granted) ──
router.get('/patient/:patientId/records', protect, requireRole('doctor'), async (req, res) => {
    try {
        // Verify doctor has active access to this patient
        const permission = await AccessPermission.findOne({
            doctor: req.user._id,
            patient: req.params.patientId,
            isActive: true
        });
        if (!permission) {
            return res.status(403).json({ message: 'You do not have access to this patient\'s records. The patient must grant you access first.' });
        }

        // Check expiry
        if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
            return res.status(403).json({ message: 'Your access to this patient has expired. Please ask the patient to renew access.' });
        }

        let query = { patient: req.params.patientId };
        
        if (permission.accessType === 'custom') {
            query._id = { $in: permission.allowedRecords || [] };
        } else if (permission.accessType === 'limited') {
            query.type = 'lab_report'; // Limited access restricts to lab reports
        }

        const records = await HealthRecord.find(query).sort({ uploadedAt: -1 });

        // Log record view to blockchain
        await BlockchainService.addBlock({
            action: 'RECORD_VIEWED',
            patientId: req.params.patientId,
            actorId: req.user._id,
            actorRole: 'doctor',
            details: `Dr. ${req.user.name} (${req.user.doctorCode}) viewed ${records.length} records`
        });

        // Log in the permission's access log
        permission.accessLog.push({
            action: 'RECORDS_VIEWED',
            timestamp: new Date()
        });
        await permission.save();

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── View a patient's medicines (only if access granted) ──
router.get('/patient/:patientId/medicines', protect, requireRole('doctor'), async (req, res) => {
    try {
        const permission = await AccessPermission.findOne({
            doctor: req.user._id,
            patient: req.params.patientId,
            isActive: true
        });
        if (!permission) {
            return res.status(403).json({ message: 'No active access to this patient.' });
        }

        if (permission.accessType === 'limited' || (permission.accessType === 'custom' && !permission.allowMedicines)) {
            return res.json([]); // Restricted from seeing full medicine list
        }

        const medicines = await Medicine.find({ patient: req.params.patientId }).sort({ createdAt: -1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── Add a consultation note to a patient's record ──
router.post('/patient/:patientId/note', protect, requireRole('doctor'), async (req, res) => {
    try {
        const permission = await AccessPermission.findOne({
            doctor: req.user._id,
            patient: req.params.patientId,
            isActive: true
        });
        if (!permission) {
            return res.status(403).json({ message: 'No active access to this patient.' });
        }

        const { title, note, diagnosis, prescriptions } = req.body;

        // Create a record as a consultation note
        const record = await HealthRecord.create({
            patient: req.params.patientId,
            title: title || `Consultation — Dr. ${req.user.name}`,
            type: 'prescription',
            description: note || '',
            source: 'doctor_note',
            isVerified: true,
            aiParsedData: {
                doctorName: req.user.name,
                diagnosis: diagnosis || '',
                summary: note || '',
                medicines: prescriptions || []
            }
        });

        // Auto-create prescribed medicines
        if (prescriptions && prescriptions.length > 0) {
            for (const med of prescriptions) {
                try {
                    await Medicine.create({
                        patient: req.params.patientId,
                        name: med.name,
                        dosage: med.dosage || 'As prescribed',
                        frequency: med.frequency || 'once_daily',
                        timings: med.timings || ['09:00 AM'],
                        prescribedBy: req.user.name,
                        notes: `Prescribed by Dr. ${req.user.name} (${req.user.doctorCode})`,
                        isActive: true
                    });
                } catch (e) { /* skip duplicates */ }
            }
        }

        // Blockchain log
        await BlockchainService.addBlock({
            action: 'RECORD_UPLOADED',
            patientId: req.params.patientId,
            actorId: req.user._id,
            actorRole: 'doctor',
            details: `Dr. ${req.user.name} (${req.user.doctorCode}) added consultation note: ${title}`,
            recordId: record._id
        });

        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── Doctor stats/profile ──
router.get('/stats', protect, requireRole('doctor'), async (req, res) => {
    try {
        const totalPatients = await AccessPermission.countDocuments({ doctor: req.user._id, isActive: true });
        const totalConsultations = await HealthRecord.countDocuments({ 'aiParsedData.doctorName': req.user.name, source: 'doctor_note' });

        res.json({
            doctorCode: req.user.doctorCode,
            specialty: req.user.specialty,
            hospital: req.user.hospital,
            totalActivePatients: totalPatients,
            totalConsultations,
            licenseNumber: req.user.licenseNumber,
            consultationFee: req.user.consultationFee,
            paymentUPI: req.user.paymentUPI,
            availableDays: req.user.availableDays || [],
            availableTimeStart: req.user.availableTimeStart,
            availableTimeEnd: req.user.availableTimeEnd
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── Update Doctor Settings ──
router.post('/settings', protect, requireRole('doctor'), async (req, res) => {
    try {
        const { consultationFee, paymentUPI, availableDays, availableTimeStart, availableTimeEnd } = req.body;
        const user = await User.findById(req.user._id);
        if (consultationFee !== undefined) user.consultationFee = consultationFee;
        if (paymentUPI !== undefined) user.paymentUPI = paymentUPI;
        if (availableDays !== undefined) user.availableDays = availableDays;
        if (availableTimeStart !== undefined) user.availableTimeStart = availableTimeStart;
        if (availableTimeEnd !== undefined) user.availableTimeEnd = availableTimeEnd;
        await user.save();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ── Health Simulation ──
router.post('/simulate-health', protect, requireRole('doctor'), simulationController.simulateHealth);
router.post('/compare-simulation', protect, requireRole('doctor'), simulationController.compareSimulation);

module.exports = router;
