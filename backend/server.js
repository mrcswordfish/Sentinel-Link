const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Add a simple homepage so you know it's working when you open the URL
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: monospace; background: #111; color: #0f0; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1>SENTINEL SERVER ONLINE</h1>
      <p>Status: Active</p>
      <p>Port: 3001</p>
    </div>
  `);
});

const server = http.createServer(app);

// Optimize for Mobile Networks (4G/5G)
const io = new Server(server, {
  pingTimeout: 60000, // Wait 60s before declaring dead (helps with spotty mobile data)
  pingInterval: 25000,
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Map to store active connections
// Key: socketId, Value: { deviceId, os, socketId }
const connectedDevices = new Map(); 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- IDENTIFICATION ---
  
  // Mobile Device Registering
  socket.on('register-device', ({ deviceId, os }) => {
    const deviceInfo = { deviceId, os, socketId: socket.id };
    connectedDevices.set(socket.id, deviceInfo);
    
    socket.data.type = 'DEVICE';
    socket.data.deviceId = deviceId;
    
    console.log(`Device registered: ${deviceId} (${os})`);
    
    // Notify all admins
    io.emit('device-online', deviceInfo);
  });

  // Admin Dashboard Registering
  socket.on('register-admin', () => {
    socket.data.type = 'ADMIN';
    console.log(`Admin connected: ${socket.id}`);
  });

  // Admin requesting list of devices
  socket.on('get-active-devices', () => {
    const devicesList = Array.from(connectedDevices.values());
    socket.emit('active-devices-list', devicesList);
  });

  // --- WEBRTC SIGNALING ---
  
  socket.on('offer', (payload) => {
    // Admin sends Offer -> Device (lookup socket ID by deviceId)
    // We need to find the socket ID for the target deviceId
    const targetDevice = Array.from(connectedDevices.values()).find(d => d.deviceId === payload.target);
    
    if (targetDevice) {
      io.to(targetDevice.socketId).emit('offer', payload);
    }
  });

  socket.on('answer', (payload) => {
    // Device sends Answer -> Admin
    // For simplicity, broadcast to all admins or store admin socket
    socket.broadcast.emit('answer', payload); 
  });

  socket.on('ice-candidate', (payload) => {
    const target = payload.target;
    // If target is 'admin', broadcast to admins
    if (target === 'admin') {
        socket.broadcast.emit('ice-candidate', payload);
    } else {
        // If target is a deviceId
        const targetDevice = Array.from(connectedDevices.values()).find(d => d.deviceId === target);
        if (targetDevice) {
            io.to(targetDevice.socketId).emit('ice-candidate', payload);
        }
    }
  });

  // --- COMMAND PROTOCOLS ---

  socket.on('command', (payload) => {
    const { targetDeviceId, command, params } = payload;
    const targetDevice = Array.from(connectedDevices.values()).find(d => d.deviceId === targetDeviceId);
    
    if (targetDevice) {
      console.log(`Sending command ${command} to ${targetDeviceId}`);
      io.to(targetDevice.socketId).emit('command', { command, params });
    } else {
      console.log(`Device ${targetDeviceId} not found`);
    }
  });

  // --- FILE MANAGEMENT ---

  socket.on('request-files', ({ targetDeviceId }) => {
    const targetDevice = Array.from(connectedDevices.values()).find(d => d.deviceId === targetDeviceId);
    if (targetDevice) io.to(targetDevice.socketId).emit('request-file-list');
  });

  socket.on('file-list', ({ files }) => {
    socket.broadcast.emit('file-list-update', files);
  });

  socket.on('delete-file', ({ targetDeviceId, filePath }) => {
     const targetDevice = Array.from(connectedDevices.values()).find(d => d.deviceId === targetDeviceId);
     if (targetDevice) io.to(targetDevice.socketId).emit('delete-file', { filePath });
  });

  socket.on('disconnect', () => {
    if (socket.data.type === 'DEVICE') {
      connectedDevices.delete(socket.id);
      io.emit('device-offline', { deviceId: socket.data.deviceId });
      console.log(`Device disconnected: ${socket.data.deviceId}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Sentinel Signaling Server running on port ${PORT}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`TO ALLOW EXTERNAL ACCESS (Internet/4G):`);
  console.log(`1. Install ngrok (https://ngrok.com)`);
  console.log(`2. Run: ngrok http ${PORT}`);
  console.log(`3. Update the SERVER_URL in 'mobile/App.tsx' with the https ngrok URL`);
  console.log(`----------------------------------------------------------------`);
});