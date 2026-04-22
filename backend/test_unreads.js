const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const unreads = await Message.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId("69d90bb714d0ab06f4808294"), isRead: false } },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);
        console.log('Unreads:', unreads);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});
