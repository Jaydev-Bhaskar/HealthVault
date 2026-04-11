const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    bp: {
        systolic: { type: Number, required: true },
        diastolic: { type: Number, required: true }
    },
    sugar: { type: Number, required: true },
    heartRate: { type: Number },
    sleepHours: { type: Number },
    steps: { type: Number },
    dietScore: { type: Number, min: 1, max: 10 },
    medicationAdherence: { type: Number, min: 0, max: 100 }
});

module.exports = mongoose.model('HealthLog', healthLogSchema);
