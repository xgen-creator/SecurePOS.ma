// server.js
const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Configuration
dotenv.config();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de données
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Modèles
const User = mongoose.model('User', {
  email: String,
  password: String,
  name: String,
  devices: [{
    deviceId: String,
    name: String,
    permissions: [String]
  }]
});

const Device = mongoose.model('Device', {
  deviceId: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  status: String,
  lastConnection: Date,
  settings: {
    autoResponse: Boolean,
    notificationPreferences: Object,
    authorizedHours: {
      start: String,
      end: String
    }
  }
});

const Visit = mongoose.model('Visit', {
  deviceId: String,
  timestamp: Date,
  type: String, // 'ring', 'delivery', 'access'
  visitor: {
    name: String,
    type: String
  },
  media: [{
    type: String,
    url: String
  }]
});

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = new User({ email, password, name });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Routes des appareils
app.post('/api/devices', authenticateToken, async (req, res) => {
  try {
    const { deviceId, name } = req.body;
    const device = new Device({
      deviceId,
      name,
      owner: req.user._id,
      status: 'active'
    });
    await device.save();
    res.json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Gestion des WebSockets
wss.on('connection', (ws, req) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'RING':
        handleDoorbell(data);
        break;
      case 'VIDEO_CALL':
        handleVideoCall(data);
        break;
      case 'DELIVERY':
        handleDelivery(data);
        break;
    }
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
