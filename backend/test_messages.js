const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const messages = await Message.find({});
    console.log(`Found ${messages.length} messages.`);
    messages.forEach(m => {
        console.log(`From: ${m.sender}, To: ${m.receiver}, Read: ${m.isRead}, Text: ${m.content}`);
    });
    process.exit(0);
});
