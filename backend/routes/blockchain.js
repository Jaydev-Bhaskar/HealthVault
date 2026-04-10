const express = require('express');
const router = express.Router();
const BlockchainService = require('../services/blockchain');
const { protect } = require('../middleware/auth');

// Get blockchain ledger for the logged-in patient
router.get('/ledger', protect, async (req, res) => {
    try {
        const blocks = await BlockchainService.getPatientLedger(req.user._id);
        res.json(blocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify full chain integrity
router.get('/verify', protect, async (req, res) => {
    try {
        const result = await BlockchainService.verifyChain();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chain stats
router.get('/stats', protect, async (req, res) => {
    try {
        const Block = require('../models/Block');
        const totalBlocks = await Block.countDocuments();
        const patientBlocks = await Block.countDocuments({ patientId: req.user._id });
        const latest = await Block.findOne().sort({ index: -1 });
        
        res.json({
            totalBlocks,
            yourTransactions: patientBlocks,
            latestBlockHash: latest ? latest.hash : 'N/A',
            latestBlockIndex: latest ? latest.index : 0,
            chainStarted: latest ? (await Block.findOne({ index: 0 }))?.timestamp : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
