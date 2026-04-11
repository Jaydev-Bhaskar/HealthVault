const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const HealthRecord = require('./models/HealthRecord');
    const records = await HealthRecord.find({});
    console.log(`Total records: ${records.length}`);
    records.forEach(r => {
        console.log(`ID: ${r._id} | Title: ${r.title} | fileUrl: ${r.fileUrl}`);
    });
    await mongoose.disconnect();
}
check().catch(console.error);
