const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const CaregiverService = require('../services/caregiverService');

// @route   GET /api/family/dashboard
// @desc    Get aggregated caregiver dashboard data including AI risk
// @access  Private (Patient/Owner only)
router.get('/dashboard', protect, async (req, res) => {
    try {
        const dashboardData = await CaregiverService.getDashboardData(req.user._id);
        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Caregiver Dashboard Error:', error.message);
        res.status(500).json({ message: 'Error retrieving caregiver dashboard data' });
    }
});

module.exports = router;
