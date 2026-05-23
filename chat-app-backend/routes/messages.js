const express = require('express');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get messages for a chat
router.get('/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.getChatMessages(parseInt(chatId));
        
        // Mark messages as read
        await Message.markAsRead(parseInt(chatId), req.user.userId);
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send a message
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { chatId, content } = req.body;
        
        if (!chatId || !content) {
            return res.status(400).json({ error: 'Chat ID and content are required' });
        }
        
        const messageId = await Message.create({
            chat_id: parseInt(chatId),
            sender_id: req.user.userId,
            content
        });
        
        res.status(201).json({
            message: 'Message sent successfully',
            messageId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;