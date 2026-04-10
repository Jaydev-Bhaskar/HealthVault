const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const HealthRecord = require('../models/HealthRecord');
const { protect } = require('../middleware/auth');
const BlockchainService = require('../services/blockchain');

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload a health record
router.post('/', protect, upload.single('file'), async (req, res) => {
    try {
        const { title, type, description } = req.body;
        const record = await HealthRecord.create({
            patient: req.user._id,
            title,
            type,
            description,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
            fileName: req.file ? req.file.originalname : ''
        });

        // Log to blockchain
        await BlockchainService.addBlock({
            action: 'RECORD_UPLOADED',
            patientId: req.user._id,
            actorId: req.user._id,
            actorRole: req.user.role || 'patient',
            details: `Record uploaded: ${title} (${type})`,
            recordId: record._id
        });

        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all records for logged-in patient
router.get('/', protect, async (req, res) => {
    try {
        const records = await HealthRecord.find({ patient: req.user._id }).sort({ uploadedAt: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single record
router.get('/:id', protect, async (req, res) => {
    try {
        const record = await HealthRecord.findById(req.params.id);
        if (record && record.patient.toString() === req.user._id.toString()) {
            res.json(record);
        } else {
            res.status(404).json({ message: 'Record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete record
router.delete('/:id', protect, async (req, res) => {
    try {
        const record = await HealthRecord.findById(req.params.id);
        if (record && record.patient.toString() === req.user._id.toString()) {
            await record.deleteOne();
            res.json({ message: 'Record deleted' });
        } else {
            res.status(404).json({ message: 'Record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get health analytics (aggregated data)
router.get('/analytics/trends', protect, async (req, res) => {
    try {
        const records = await HealthRecord.find({ patient: req.user._id }).sort({ uploadedAt: -1 });
        const totalRecords = records.length;
        const verifiedCount = records.filter(r => r.isVerified).length;
        const typeBreakdown = {};
        records.forEach(r => { typeBreakdown[r.type] = (typeBreakdown[r.type] || 0) + 1; });

        // Extract key metrics from AI-parsed data
        const metrics = [];
        records.forEach(r => {
            if (r.aiParsedData && r.aiParsedData.keyMetrics) {
                r.aiParsedData.keyMetrics.forEach(m => {
                    metrics.push({ ...m.toObject(), date: r.uploadedAt });
                });
            }
        });

        res.json({
            totalRecords,
            verifiedCount,
            typeBreakdown,
            recentMetrics: metrics.slice(0, 20),
            healthConsistency: totalRecords > 0 ? Math.round((verifiedCount / totalRecords) * 100) : 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Hospital uploads a report to a patient's vault
router.post('/hospital-upload', protect, upload.single('file'), async (req, res) => {
    try {
        const { title, type, description, patientHealthId, uploadedBy, uploadedByCode } = req.body;
        const User = require('../models/User');
        
        // Find the patient by Health ID
        const patient = await User.findOne({ healthId: patientHealthId, role: 'patient' });
        if (!patient) return res.status(404).json({ message: 'Patient not found with this Health ID.' });

        const record = await HealthRecord.create({
            patient: patient._id,
            title,
            type,
            description: `${description || ''} [Uploaded by: ${uploadedBy} (${uploadedByCode})]`.trim(),
            fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
            fileName: req.file ? req.file.originalname : '',
            source: 'hospital_upload'
        });

        // Log to blockchain
        await BlockchainService.addBlock({
            action: 'RECORD_UPLOADED',
            patientId: patient._id,
            actorId: req.user._id,
            actorRole: 'hospital',
            details: `Hospital ${uploadedBy} (${uploadedByCode}) uploaded: ${title} (${type})`,
            recordId: record._id
        });

        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

