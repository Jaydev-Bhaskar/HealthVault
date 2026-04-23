require('dotenv').config();
const mongoose = require('mongoose');

// Minimal schema to read from the 'blocks' collection
const BlockSchema = new mongoose.Schema({}, { strict: false, collection: 'blocks' });
const Block = mongoose.models.Block || mongoose.model('Block', BlockSchema);

async function getLatestBlock() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI or MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    console.log('Fetching latest block...\n');
    
    // Fetch the latest block, sorted by index descending, and select only required fields
    const latestBlock = await Block.findOne()
      .sort({ index: -1 })
      .select('index hash blockchainTx timestamp -_id')
      .lean();

    if (latestBlock) {
      console.log('=== Latest Block ===');
      console.log(JSON.stringify(latestBlock, null, 2));
    } else {
      console.log('No blocks found in the database.');
    }
  } catch (error) {
    console.error('Error fetching latest block:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

getLatestBlock();
