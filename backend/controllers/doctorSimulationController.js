const HealthLog = require('../models/HealthLog');
const HealthRecord = require('../models/HealthRecord');
const predictionService = require('../services/predictionService');

/**
 * Simulate Health Future
 * POST /api/doctor/simulate-health
 */
exports.simulateHealth = async (req, res) => {
    try {
        const { patientId, days, mode } = req.body;
        
        // Fetch logs and records in parallel
        const [logs, records] = await Promise.all([
            HealthLog.find({ userId: patientId }).sort({ date: 1 }).limit(30),
            HealthRecord.find({ patient: patientId, source: 'ai_ocr' }).sort({ uploadedAt: 1 })
        ]);

        if (logs.length === 0 && records.length === 0) {
            return res.status(404).json({ message: "No health data found for this patient. Prediction requires historical logs or clinical records." });
        }

        const prediction = predictionService.predictHealth(logs, parseInt(days) || 30, mode || 'current', records);
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Compare Current vs Improved Scenarios
 * POST /api/doctor/compare-simulation
 */
exports.compareSimulation = async (req, res) => {
    try {
        const { patientId, days } = req.body;
        
        const [logs, records] = await Promise.all([
            HealthLog.find({ userId: patientId }).sort({ date: 1 }).limit(30),
            HealthRecord.find({ patient: patientId, source: 'ai_ocr' }).sort({ uploadedAt: 1 })
        ]);

        if (logs.length === 0 && records.length === 0) {
            return res.status(404).json({ message: "No health data found for this patient." });
        }

        const currentScenario = predictionService.predictHealth(logs, parseInt(days) || 30, 'current', records);
        const improvedScenario = predictionService.predictHealth(logs, parseInt(days) || 30, 'improved', records);

        res.json({
            current: currentScenario,
            improved: improvedScenario
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
