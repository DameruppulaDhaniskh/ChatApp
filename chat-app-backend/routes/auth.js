const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { full_name, username, password, confirmPassword } = req.body;
        
        if (!full_name || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        
        // Check if user exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        const userId = await User.create({ full_name, username, password });
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Update user status to online
        await User.updateStatus(user.id, 'online');
        
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Forgot Password (basic implementation for username)
router.post('/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        res.json({ message: 'Password reset instructions sent to your registered username contact.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;