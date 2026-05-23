const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const startCronJobs = require('./utils/cronJobs');

// Global io instance for controllers
global.io = io;

// Socket connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User joined room: ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Home Route
app.get("/", (req, res) => {
    res.send("HBDS Backend is Running");
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Start background cron jobs
startCronJobs();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} at all interfaces`);
});