const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const friendshipRoutes = require('./routes/friendships');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
});

const PORT = process.env.PORT || 5000;
const onlineUsers = new Map();

// Export io and onlineUsers via app.set() so all routes can access them
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes); 
app.use('/api/friendships', friendshipRoutes); 

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Serve static files from the React app dist folder in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../Chat App UI/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../Chat App UI/dist/index.html'));
    });
}

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('userOnline', async (userId) => {
        try {
            if (userId) {
                const parsedUserId = parseInt(userId);
                onlineUsers.set(parsedUserId, socket.id);
                console.log(`User ${parsedUserId} is online with socket ID ${socket.id}`);
                
                // Update status to online in MySQL
                await User.updateStatus(parsedUserId, 'online');
            }
        } catch (error) {
            console.error('Error handling userOnline socket event:', error);
        }
    });

    socket.on('typing', ({ chatId, senderId, receiverId }) => {
        try {
            if (receiverId) {
                const receiverSocketId = onlineUsers.get(parseInt(receiverId));
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('userTyping', { 
                        chatId: parseInt(chatId), 
                        senderId: parseInt(senderId) 
                    });
                }
            }
        } catch (error) {
            console.error('Error handling typing socket event:', error);
        }
    });

    socket.on('stopTyping', ({ chatId, senderId, receiverId }) => {
        try {
            if (receiverId) {
                const receiverSocketId = onlineUsers.get(parseInt(receiverId));
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('userStopTyping', { 
                        chatId: parseInt(chatId), 
                        senderId: parseInt(senderId) 
                    });
                }
            }
        } catch (error) {
            console.error('Error handling stopTyping socket event:', error);
        }
    });

    socket.on('markAsRead', ({ chatId, readerId, senderId }) => {
        try {
            if (senderId) {
                const senderSocketId = onlineUsers.get(parseInt(senderId));
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messagesRead', { 
                        chatId: parseInt(chatId), 
                        readerId: parseInt(readerId) 
                    });
                }
            }
        } catch (error) {
            console.error('Error handling markAsRead socket event:', error);
        }
    });

    socket.on('disconnect', async () => {
        console.log('Socket disconnected:', socket.id);
        try {
            let disconnectedUserId = null;
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    break;
                }
            }
            if (disconnectedUserId) {
                onlineUsers.delete(disconnectedUserId);
                // Update status to offline in MySQL
                await User.updateStatus(disconnectedUserId, 'offline');
                console.log(`User ${disconnectedUserId} status set to offline in database`);
            }
        } catch (error) {
            console.error('Error handling disconnect socket event:', error);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});