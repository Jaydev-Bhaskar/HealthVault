const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const BlockchainService = require('./services/blockchain');

dotenv.config();
connectDB().then(async () => {
    // Initialize genesis block on startup
    await BlockchainService.getLatestBlock();
    console.log('⛓️  Blockchain genesis verified');
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/records', require('./routes/records'));
app.use('/api/access', require('./routes/access'));
app.use('/api/medicines', require('./routes/medicine'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/family', require('./routes/family'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: '✅ HealthVault AI Backend Running', timestamp: new Date(), version: '2.0.0' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 HealthVault AI Backend running on port ${PORT}`));

