const express = require('express');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');
const { analyzeSentiment } = require('../utils/sentiment');
const db = require('../config/database');
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

        const parsedChatId = parseInt(chatId);
        const senderId = req.user.userId;

        // Fetch chat to find receiverId
        const [chats] = await db.execute(
            'SELECT user1_id, user2_id FROM chats WHERE id = ?',
            [parsedChatId]
        );

        if (chats.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const chat = chats[0];
        const receiverId = chat.user1_id === senderId ? chat.user2_id : chat.user1_id;

        // Non-blocking sentiment analysis
        let sentiment = 'neutral';
        try {
            sentiment = await analyzeSentiment(content);
        } catch (sentimentErr) {
            console.error('Sentiment analysis failed, falling back to neutral:', sentimentErr);
        }

        const messageId = await Message.create({
            chat_id: parsedChatId,
            sender_id: senderId,
            content,
            sentiment
        });

        // Get sender's name
        let senderName = 'User';
        const [users] = await db.execute('SELECT full_name FROM users WHERE id = ?', [senderId]);
        if (users.length > 0) {
            senderName = users[0].full_name;
        }

        const newMessageObj = {
            id: messageId,
            chat_id: parsedChatId,
            sender_id: senderId,
            content,
            sentiment,
            is_read: false,
            created_at: new Date().toISOString(),
            sender_name: senderName
        };

        // Emit new message to receiver via Socket.io
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');

        if (io && onlineUsers) {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('newMessage', newMessageObj);
            }
        }

        res.status(201).json({
            message: 'Message sent successfully',
            messageId,
            newMessage: newMessageObj
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark messages as read
router.patch('/read', authenticateToken, async (req, res) => {
    try {
        const { chatId, senderId } = req.body;
        
        if (!chatId || !senderId) {
            return res.status(400).json({ error: 'Chat ID and Sender ID are required' });
        }

        const parsedChatId = parseInt(chatId);
        const parsedSenderId = parseInt(senderId);

        // Update database
        await db.execute(
            'UPDATE messages SET is_read = TRUE WHERE chat_id = ? AND sender_id = ?',
            [parsedChatId, parsedSenderId]
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;