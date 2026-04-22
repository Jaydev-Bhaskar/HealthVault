const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const AccessPermission = require('../models/AccessPermission');
const jwt = require('jsonwebtoken');

// Middleware to verify token for chat
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// GET /api/chat/unread
// Fetch total unread messages grouped by sender
router.get('/unread', verifyToken, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        // Aggregate unread messages by sender for the current user
        const unreads = await Message.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId(req.user.id), isRead: false } },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);
        
        let counterData = {};
        let total = 0;
        unreads.forEach(u => {
            counterData[u._id.toString()] = u.count;
            total += u.count;
        });
        
        res.json({ total, senders: counterData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching unread counts' });
    }
});

// GET /api/chat/:partnerId
// Fetch conversation between current user and partnerId
router.get('/:partnerId', verifyToken, async (req, res) => {
    try {
        const partnerId = req.params.partnerId;
        
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: partnerId },
                { sender: partnerId, receiver: req.user.id }
            ]
        }).sort('timestamp');
        
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// POST /api/chat/send
// Send a message to a partner
router.post('/send', verifyToken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        
        if (!receiverId || !content.trim()) {
            return res.status(400).json({ message: 'Receiver and content are required' });
        }
        
        // Optional: Can add a check here to ensure access exists if receiver is doctor or patient.
        
        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiverId,
            content: content.trim()
        });
        
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// POST /api/chat/mark-read
// Mark a conversation as read from a specific sender
router.post('/mark-read', verifyToken, async (req, res) => {
    try {
        const { senderId } = req.body;
        if (!senderId) return res.status(400).json({ message: 'senderId is required' });
        
        await Message.updateMany(
            { sender: senderId, receiver: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Error marking messages as read' });
    }
});

module.exports = router;
