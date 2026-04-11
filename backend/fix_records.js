const mongoose = require('mongoose');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function fixRecords() {
    await mongoose.connect(process.env.MONGO_URI);
    const HealthRecord = require('./models/HealthRecord');
    
    // Find all records with local file paths  
    const records = await HealthRecord.find({ fileUrl: { $regex: '^/uploads/' } });
    console.log('Records with local file paths:', records.length);
    
    // Search Cloudinary healthvault folder for matching files
    try {
        const result = await cloudinary.search
            .expression('folder:healthvault')
            .sort_by('created_at', 'desc')
            .max_results(30)
            .execute();
        
        console.log('\nCloudinary healthvault files:', result.total_count);
        
        for (const resource of result.resources) {
            console.log('  Cloud:', resource.public_id, '-', resource.secure_url);
        }
        
        // Try matching by fileName
        let updated = 0;
        for (const record of records) {
            // Match by fileName in Cloudinary
            const match = result.resources.find(r => {
                const cloudName = r.public_id.split('/').pop();
                const localName = record.fileUrl.split('/').pop().replace(/^\d+-/, '');
                return cloudName.includes(localName.replace(/\.[^.]+$/, '')) || 
                       r.public_id.includes(record.fileUrl.split('/').pop().replace(/\.[^.]+$/, ''));
            });
            
            if (match) {
                console.log(`\n✅ Match found for record ${record._id}:`);
                console.log(`   Old: ${record.fileUrl}`);
                console.log(`   New: ${match.secure_url}`);
                record.fileUrl = match.secure_url;
                await record.save();
                updated++;
            } else {
                console.log(`\n❌ No Cloudinary match for: ${record.fileName}`);
            }
        }
        
        console.log(`\n\nUpdated ${updated} of ${records.length} records`);
    } catch (err) {
        console.error('Cloudinary search error:', err.message);
    }
    
    await mongoose.disconnect();
}

fixRecords().catch(console.error);
