// Demo data for when backend is not connected
export const demoUser = {
    _id: 'demo123',
    name: 'Aryan Sharma',
    email: 'aryan@healthvault.ai',
    role: 'patient',
    healthId: 'HV-M2X9K7PL',
    healthScore: 850,
    bloodGroup: 'O+',
    age: 28,
    phone: '+91 98765 43210',
    allergies: ['Penicillin', 'Dust'],
    chronicIllnesses: ['Mild Asthma'],
    currentMedications: ['Montelukast 10mg'],
    emergencyContact: { name: 'Priya Sharma', phone: '+91 87654 32109', relation: 'Spouse' },
    token: 'demo_token'
};

// Check if user is the demo user (so we only show static data for demo, not real users)
export const isDemoUser = (user) => {
    return user?._id === 'demo123' || user?.token === 'demo_token';
};

export const demoRecords = [
    {
        _id: '1',
        title: 'Dr. Sharma Prescription',
        type: 'prescription',
        description: 'Follow-up for seasonal asthma',
        isVerified: true,
        source: 'ai_ocr',
        uploadedAt: '2026-04-05T10:30:00Z',
        aiParsedData: {
            medicines: [
                { name: 'Montelukast', dosage: '10mg', frequency: 'Once daily', duration: '30 days' },
                { name: 'Cetirizine', dosage: '5mg', frequency: 'As needed', duration: '15 days' }
            ],
            diagnosis: 'Seasonal allergic rhinitis with mild asthma',
            doctorName: 'Dr. Rohit Sharma',
            summary: 'Patient shows improvement. Continue current medication and monitor.'
        }
    },
    {
        _id: '2',
        title: 'Apollo Blood Test Report',
        type: 'lab_report',
        description: 'Complete Blood Count & Lipid Profile',
        isVerified: true,
        source: 'manual_upload',
        uploadedAt: '2026-03-28T14:00:00Z',
        aiParsedData: {
            keyMetrics: [
                { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', status: 'normal' },
                { name: 'Total Cholesterol', value: '195', unit: 'mg/dL', status: 'normal' },
                { name: 'Blood Sugar (Fasting)', value: '98', unit: 'mg/dL', status: 'normal' },
                { name: 'Blood Pressure', value: '120/78', unit: 'mmHg', status: 'normal' }
            ],
            summary: 'All parameters within normal range. Cholesterol showing downward trend.'
        }
    },
    {
        _id: '3',
        title: 'City Hospital Chest X-Ray',
        type: 'scan',
        description: 'Annual chest X-ray for asthma monitoring',
        isVerified: false,
        source: 'manual_upload',
        uploadedAt: '2026-03-15T09:00:00Z',
        aiParsedData: {
            summary: 'No significant abnormalities detected. Lungs appear clear.'
        }
    },
    {
        _id: '4',
        title: 'COVID-19 Booster Vaccination',
        type: 'vaccination',
        description: 'Moderna Bivalent Booster dose',
        isVerified: true,
        source: 'cowin_sync',
        uploadedAt: '2026-02-10T11:00:00Z',
        aiParsedData: {
            summary: 'COVID-19 booster administered. Certificate verified via CoWIN.'
        }
    }
];

export const demoPermissions = [
    { _id: 'p1', doctorName: 'Dr. Rohit Sharma', doctorSpecialty: 'Pulmonologist', hospital: 'City Hospital, Pune', isActive: true, accessType: 'full', grantedAt: '2026-01-15T10:00:00Z' },
    { _id: 'p2', doctorName: 'Dr. Priya Desai', doctorSpecialty: 'General Physician', hospital: 'Apollo Clinic, Pune', isActive: true, accessType: 'limited', grantedAt: '2026-03-01T10:00:00Z' },
    { _id: 'p3', doctorName: 'Dr. Aman Kulkarni', doctorSpecialty: 'Cardiologist', hospital: 'Ruby Hall, Pune', isActive: false, accessType: 'limited', grantedAt: '2025-12-01T10:00:00Z' }
];

export const demoFamilyMembers = [
    { _id: 'f1', name: 'Priya Sharma', healthId: 'HV-K8N2P5QL', bloodGroup: 'A+', age: 26, healthScore: 780, riskLevel: 'LOW', medicines: [{ name: 'Vitamin C' }], latestRecord: { title: 'Annual Checkup', type: 'lab_report', uploadedAt: '2026-03-20T10:00:00Z' } },
    { _id: 'f2', name: 'Ramesh Sharma', healthId: 'HV-R3M7X1PL', bloodGroup: 'O+', age: 58, healthScore: 620, riskLevel: 'MEDIUM', medicines: [{ name: 'Amlodipine' }, { name: 'Metformin' }], latestRecord: { title: 'Cardiology Report', type: 'scan', uploadedAt: '2026-04-01T14:30:00Z' } }
];

export const demoInsights = [
    { id: 1, type: 'positive', title: 'Blood Pressure Trend', message: 'Your BP has been consistently normal for the last 3 months. Great job!' },
    { id: 2, type: 'warning', title: 'Cholesterol Watch', message: 'Total cholesterol is at 195 mg/dL. Consider reducing saturated fat intake.' },
    { id: 3, type: 'positive', title: 'Medication Adherence', message: 'You have maintained 95% adherence to your Montelukast schedule.' },
    { id: 4, type: 'info', title: 'Upcoming Vaccination', message: 'Your annual flu shot is due next month. Schedule with your physician.' }
];

export const demoHealthTrends = [
    { month: 'Nov', bp_sys: 138, bp_dia: 88, sugar: 145, cholesterol: 235 },
    { month: 'Dec', bp_sys: 134, bp_dia: 86, sugar: 132, cholesterol: 225 },
    { month: 'Jan', bp_sys: 128, bp_dia: 84, sugar: 118, cholesterol: 215 },
    { month: 'Feb', bp_sys: 125, bp_dia: 82, sugar: 110, cholesterol: 205 },
    { month: 'Mar', bp_sys: 122, bp_dia: 80, sugar: 105, cholesterol: 198 },
    { month: 'Apr', bp_sys: 118, bp_dia: 77, sugar: 98, cholesterol: 192 }
];

export const demoBlockchain = {
    stats: { totalBlocks: 8, yourTransactions: 7, latestBlockIndex: 7, latestBlockHash: '00a3f7c8d2e5b19084f6a2c73d5e8b01f4a7c9d2e6b3f1084a7c5d9e2b6f3a18' },
    ledger: [
        { _id: 'b7', index: 7, action: 'MEDICINE_ADDED', timestamp: '2026-04-08T09:00:00Z', details: 'Batch medicines added: Montelukast 10mg, Cetirizine 5mg', hash: '00a3f7c8d2e5b19084f6a2c73d5e8b01f4a7c9d2e6b3f1084a7c5d9e2b6f3a18', previousHash: '006b2c9d4e7f1a38054c6d8e2b5f7a19083c5d7e9a2b4f6108' },
        { _id: 'b6', index: 6, action: 'RECORD_UPLOADED', timestamp: '2026-04-05T10:30:00Z', details: 'Record uploaded: Dr. Sharma Prescription (prescription)', hash: '006b2c9d4e7f1a38054c6d8e2b5f7a19083c5d7e9a2b4f6108', previousHash: '00d4e6f8a1b3c5072d4e6f8a1b3c50729e1a3c5d7f90b2d4e6' },
        { _id: 'b5', index: 5, action: 'ACCESS_REVOKED', timestamp: '2026-04-01T14:00:00Z', details: 'Access suspended for Dr. Aman Kulkarni (DR-K7M2)', hash: '00d4e6f8a1b3c5072d4e6f8a1b3c50729e1a3c5d7f90b2d4e6', previousHash: '00f1a3c5d7e9b20483f5a7c9d1e3b50627d9e' },
        { _id: 'b4', index: 4, action: 'EMERGENCY_ACCESS', timestamp: '2026-03-28T08:15:00Z', details: 'Emergency QR code generated', hash: '00f1a3c5d7e9b20483f5a7c9d1e3b50627d9e', previousHash: '00c8d0e2f4a6b8173c5d7e9f1a3b5072' },
        { _id: 'b3', index: 3, action: 'ACCESS_GRANTED', timestamp: '2026-03-01T10:00:00Z', details: 'Patient granted limited access to Dr. Priya Desai (DR-PD91)', hash: '00c8d0e2f4a6b8173c5d7e9f1a3b5072', previousHash: '009a1b3c5d7e9f20463b5d7e9f1a3c50' },
        { _id: 'b2', index: 2, action: 'RECORD_UPLOADED', timestamp: '2026-02-10T11:00:00Z', details: 'Record uploaded: COVID-19 Booster Vaccination (vaccination)', hash: '009a1b3c5d7e9f20463b5d7e9f1a3c50', previousHash: '005c7d9e1f3a5b72084c6d8e0f2a4b60' },
        { _id: 'b1', index: 1, action: 'ACCESS_GRANTED', timestamp: '2026-01-15T10:00:00Z', details: 'Patient granted full access to Dr. Rohit Sharma (DR-RS42)', hash: '005c7d9e1f3a5b72084c6d8e0f2a4b60', previousHash: '0000000000000000000000000000000000000000000000000000000000000000' },
        { _id: 'b0', index: 0, action: 'GENESIS', timestamp: '2026-01-01T00:00:00Z', details: 'HealthVault AI Genesis Block — Chain Initialized', hash: '0000000000000000000000000000000000000000000000000000000000000000', previousHash: '0' }
    ]
};

