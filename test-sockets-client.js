const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('CONNECTED to local socket server');
    socket.emit('join', 'test-user-id');
});

socket.on('new_notification', (data) => {
    console.log('RECEIVED Notification:', JSON.stringify(data, null, 2));
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('CONNECTION ERROR:', err.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('TIMEOUT: No notification received');
    process.exit(1);
}, 10000);
