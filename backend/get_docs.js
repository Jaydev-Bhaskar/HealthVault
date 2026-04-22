const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const passwordsToTest = ['password123', '123456', '12345678', 'admin123', 'password', 'demo123'];

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const doctor = await User.findOne({ email: 'demo_doctor@healthvault.ai' });
    if (!doctor) { console.log('not found'); process.exit(0); }
    
    for (const p of passwordsToTest) {
        if (await bcrypt.compare(p, doctor.password)) {
            console.log('Match found:', p);
            process.exit(0);
        }
    }
    console.log('No match found');
    process.exit(0);
});
