const express = require('express');
const Friendship = require('../models/Friendship');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Send a friend request
router.post('/request', authenticateToken, async (req, res) => {
    try {
        const { receiverId } = req.body;
        if (!receiverId) {
            return res.status(400).json({ error: 'Receiver ID is required' });
        }
        if (req.user.userId === parseInt(receiverId)) {
            return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
        }

        await Friendship.sendRequest(req.user.userId, parseInt(receiverId));
        res.json({ message: 'Friend request sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept a friend request
router.post('/accept', authenticateToken, async (req, res) => {
    try {
        const { senderId } = req.body;
        if (!senderId) {
            return res.status(400).json({ error: 'Sender ID is required' });
        }

        await Friendship.acceptRequest(req.user.userId, parseInt(senderId));
        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject/Cancel request or Unfriend
router.post('/reject', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        if (!otherUserId) {
            return res.status(400).json({ error: 'Other User ID is required' });
        }

        await Friendship.rejectOrCancelRequest(req.user.userId, parseInt(otherUserId));
        res.json({ message: 'Friend request rejected or unfriend completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all friendships and requests of current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const friendships = await Friendship.getUserFriendships(req.user.userId);
        res.json(friendships);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
