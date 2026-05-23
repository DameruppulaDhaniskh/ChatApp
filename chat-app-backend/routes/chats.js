const express = require('express');
const Chat = require('../models/Chat');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get user's chats
router.get('/', authenticateToken, async (req, res) => {
    try {
        const chats = await Chat.getUserChats(req.user.userId);
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or get chat with another user
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        
        if (!otherUserId) {
            return res.status(400).json({ error: 'Other user ID is required' });
        }

        // Verify friendship is accepted
        const friendship = await Friendship.getFriendshipStatus(req.user.userId, parseInt(otherUserId));
        if (!friendship || friendship.status !== 'accepted') {
            return res.status(403).json({ error: 'You must be accepted friends with this user to open a chat' });
        }
        
        const chat = await Chat.findOrCreate(req.user.userId, parseInt(otherUserId));
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get consolidated session details for a chat
router.get('/session/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user.userId;
        const otherId = parseInt(otherUserId);

        if (!otherId) {
            return res.status(400).json({ error: 'Other user ID is required' });
        }

        // 1. Parallel fetch of friendship status, chat session, and recipient info
        const [friendship, chat, recipient] = await Promise.all([
            Friendship.getFriendshipStatus(currentUserId, otherId),
            Chat.findOrCreate(currentUserId, otherId),
            User.findById(otherId)
        ]);

        // 2. Verify recipient exists
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient user not found' });
        }

        // 3. Verify friendship is accepted
        if (!friendship || friendship.status !== 'accepted') {
            return res.status(403).json({ error: 'You must be accepted friends with this user to open a chat' });
        }

        // 4. Fetch messages and mark as read concurrently
        const [messages] = await Promise.all([
            Message.getChatMessages(chat.id),
            Message.markAsRead(chat.id, currentUserId)
        ]);

        // 5. Send single response
        res.json({
            chat,
            recipient,
            messages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;