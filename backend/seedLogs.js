const mongoose = require('mongoose');
const HealthLog = require('./models/HealthLog');
require('dotenv').config();

const patientId = '69d8fcc6726cf42e5387fa51'; // From database (SAI G)

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing logs for this patient
        await HealthLog.deleteMany({ userId: patientId });

        const logs = [];
        const now = new Date();
        
        // Generate 30 days of logs with a slightly declining trend (bad path)
        for (let i = 30; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            
            // Slightly increasing BP and Sugar
            const bpSystolic = 120 + (30 - i) * 0.5 + Math.random() * 5;
            const bpDiastolic = 80 + (30 - i) * 0.3 + Math.random() * 3;
            const sugar = 100 + (30 - i) * 1.5 + Math.random() * 10;
            const sleep = 8 - (30 - i) * 0.05 + Math.random();

            logs.push({
                userId: patientId,
                date: date,
                bp: {
                    systolic: Math.round(bpSystolic),
                    diastolic: Math.round(bpDiastolic)
                },
                sugar: Math.round(sugar),
                heartRate: 70 + Math.random() * 10,
                sleepHours: Math.round(sleep * 10) / 10,
                steps: 5000 - (30-i)*50,
                dietScore: 7 - (30-i)*0.1,
                medicationAdherence: 95
            });
        }

        await HealthLog.insertMany(logs);
        console.log('Successfully seeded 30 days of health logs for patient ' + patientId);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
