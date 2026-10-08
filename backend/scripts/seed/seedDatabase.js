/**
 * HealthVault AI — Database Seeder
 * 
 * This script seeds a realistic demo dataset for testing and demonstration.
 * Features:
 * - Idempotent: Skips if demo users already exist.
 * - Non-destructive: Does not delete existing data.
 * - Consistent: Links all models correctly.
 */

require('dotenv').config(); // Load from CWD when running npm script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Models
const User = require('../../models/User');
const HealthRecord = require('../../models/HealthRecord');
const Medicine = require('../../models/Medicine');
const Block = require('../../models/Block');
const AccessPermission = require('../../models/AccessPermission');
const HealthLog = require('../../models/HealthLog');

// Configuration
const MONGO_URI = process.env.MONGO_URI;

// Constants
const PASSWORD = 'password123';
const DEMO_EMAIL_PREFIX = 'demo_';

const calculateHash = (block) => {
  const data = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    action: block.action,
    patientId: block.patientId,
    actorId: block.actorId,
    details: block.details,
    previousHash: block.previousHash,
    nonce: block.nonce
  });
  return crypto.createHash('sha256').update(data).digest('hex');
};

const seed = async () => {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Check if seeding is already done
        const existingPatient = await User.findOne({ email: 'demo_patient@healthvault.ai' });
        if (existingPatient) {
            console.log('⚠️  Demo data already exists. Skipping seeding to prevent duplicates.');
            process.exit(0);
            return;
        }

        console.log('🌱 Starting Seed Process...');

        // 2. Create Users
        console.log('👤 Creating Users...');
        
        // Hashing password once for all
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(PASSWORD, salt);

        const patient = await User.create({
            name: 'Aryan Sharma',
            email: 'demo_patient@healthvault.ai',
            password: PASSWORD, // Schema has pre-save hook for password hash, wait... 
            // Better to pass plain text if schema handles it, or check User model.
            // My earlier view showed userSchema.pre('save') handles hash.
            phone: '+91 9876543210',
            aadhaarId: '123456789012',
            role: 'patient',
            bloodGroup: 'O+',
            age: 28,
            healthScore: 780
        });

        const wife = await User.create({
            name: 'Priya Sharma',
            email: 'demo_wife@healthvault.ai',
            password: PASSWORD,
            role: 'patient',
            bloodGroup: 'A+',
            age: 26
        });

        const father = await User.create({
            name: 'Rajesh Sharma',
            email: 'demo_father@healthvault.ai',
            password: PASSWORD,
            role: 'patient',
            bloodGroup: 'O+',
            age: 58
        });

        // Link family
        patient.familyMembers.push(wife._id, father._id);
        await patient.save();

        const doctor = await User.create({
            name: 'Dr. Sameer Malhotra',
            email: 'demo_doctor@healthvault.ai',
            password: PASSWORD,
            role: 'doctor',
            specialty: 'Cardiologist',
            hospital: 'City Heart Hospital',
            licenseNumber: 'MC-29384'
        });

        const hospital = await User.create({
            name: 'Apollo Diagnostics',
            email: 'demo_lab@healthvault.ai',
            password: PASSWORD,
            role: 'hospital',
            registrationNumber: 'REG-5566',
            labTypes: ['Pathology', 'Radiology'],
            address: '42 Health Lane, New Delhi'
        });

        console.log(`✅ Users created: ${patient.email}, ${doctor.doctorCode}, ${hospital.labCode}`);

        // 3. Create Blockchain Genesis Block if not exists
        let lastBlock = await Block.findOne().sort({ index: -1 });
        if (!lastBlock) {
            const genesisBlock = {
                index: 0,
                action: 'GENESIS',
                previousHash: '0'.repeat(64),
                details: 'HealthVault Genesis Block'
            };
            genesisBlock.hash = calculateHash(genesisBlock);
            lastBlock = await Block.create(genesisBlock);
            console.log('⛓️  Blockchain initialized.');
        }

        // 4. Create Health Records
        console.log('📄 Creating Health Records...');
        const record1 = await HealthRecord.create({
            patient: patient._id,
            title: 'Cardiac Checkup Jan 2024',
            type: 'lab_report',
            description: 'Routine blood test and ECG.',
            fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample_report.pdf',
            fileName: 'lab_report_cardio.pdf',
            aiParsedData: {
                medicines: [{ name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days' }],
                diagnosis: 'General well-being, slight hypertension',
                doctorName: 'Dr. Kohli',
                summary: 'Blood pressure slightly elevated. Cholesterol normal.',
                keyMetrics: [
                    { name: 'Systolic BP', value: '135', unit: 'mmHg', status: 'high' },
                    { name: 'Diastolic BP', value: '88', unit: 'mmHg', status: 'normal' }
                ]
            },
            source: 'manual_upload',
            uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        });

        const block1Data = {
            index: lastBlock.index + 1,
            action: 'RECORD_UPLOADED',
            patientId: patient._id,
            actorId: patient._id,
            actorRole: 'patient',
            details: `Uploaded record: ${record1.title}`,
            recordId: record1._id,
            previousHash: lastBlock.hash
        };
        block1Data.hash = calculateHash(block1Data);
        lastBlock = await Block.create(block1Data);
        record1.blockchainHash = lastBlock.hash;
        await record1.save();

        const record2 = await HealthRecord.create({
            patient: father._id,
            title: 'Diabetes Screening',
            type: 'lab_report',
            aiParsedData: {
                diagnosis: 'Type 2 Diabetes',
                summary: 'Elevated HbA1c levels.',
                keyMetrics: [{ name: 'HbA1c', value: '7.8', unit: '%', status: 'high' }]
            }
        });

        // 5. Create Medicines
        console.log('💊 Adding Medicines...');
        await Medicine.create({
            patient: patient._id,
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'once_daily',
            timings: ['08:00 AM'],
            startDate: new Date(),
            prescribedBy: doctor.name,
            adherenceLog: [
                { date: new Date(Date.now() - 86400000), taken: true, timing: '08:05 AM' },
                { date: new Date(Date.now() - 172800000), taken: false }
            ]
        });

        await Medicine.create({
            patient: father._id,
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'twice_daily',
            timings: ['08:00 AM', '08:00 PM'],
            prescribedBy: 'Dr. Batra'
        });

        // 6. Access Permissions
        console.log('🔐 Granting Permissions...');
        await AccessPermission.create({
            patient: patient._id,
            doctor: doctor._id,
            doctorName: doctor.name,
            doctorCode: doctor.doctorCode,
            doctorSpecialty: doctor.specialty,
            hospital: doctor.hospital,
            isActive: true,
            accessType: 'full'
        });

        // 7. Health Logs
        console.log('📊 Generating Health Logs...');
        const days = 7;
        const logs = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            logs.push({
                userId: patient._id,
                date: date,
                bp: { systolic: 120 + Math.floor(Math.random() * 15), diastolic: 80 + Math.floor(Math.random() * 8) },
                sugar: 90 + Math.floor(Math.random() * 40),
                heartRate: 65 + Math.floor(Math.random() * 15),
                sleepHours: 6 + Math.floor(Math.random() * 3),
                steps: 4000 + Math.floor(Math.random() * 6000),
                dietScore: 7 + Math.floor(Math.random() * 3),
                medicationAdherence: 80 + Math.floor(Math.random() * 20)
            });
        }
        await HealthLog.insertMany(logs);

        console.log('\n✨ Database Seeded Successfully!');
        console.log('--------------------------------------------------');
        console.log('Credentials for Testing:');
        console.log(`Patient: ${patient.email} / ${PASSWORD}`);
        console.log(`Doctor:  ${doctor.email} / ${PASSWORD} (Code: ${doctor.doctorCode})`);
        console.log(`Lab:     ${hospital.email} / ${PASSWORD} (Code: ${hospital.labCode})`);
        console.log('--------------------------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        process.exit(1);
    }
};

seed();
