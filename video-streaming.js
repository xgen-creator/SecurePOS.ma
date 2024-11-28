// videoStreamService.js
const WebSocket = require('ws');
const WebRTC = require('wrtc');
const ffmpeg = require('fluent-ffmpeg');

class VideoStreamService {
  constructor() {
    this.streams = new Map();
    this.peerConnections = new Map();
  }

  async startStream(deviceId, quality = 'HD') {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: process.env.TURN_SERVER,
          username: process.env.TURN_USERNAME,
          credential: process.env.TURN_PASSWORD
        }
      ]
    };

    // Créer une nouvelle connexion WebRTC
    const peerConnection = new WebRTC.RTCPeerConnection(configuration);
    
    // Configurer la qualité du stream
    const videoConstraints = this.getVideoConstraints(quality);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: true
    });

    // Ajouter les tracks au peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Gestion de l'adaptation de la qualité
    peerConnection.onconnectionstatechange = () => {
      this.handleConnectionStateChange(deviceId, peerConnection);
    };

    this.streams.set(deviceId, stream);
    this.peerConnections.set(deviceId, peerConnection);

    return peerConnection;
  }

  getVideoConstraints(quality) {
    const constraints = {
      'HD': {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      'SD': {
        width: { ideal: 720 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      },
      'LOW': {
        width: { ideal: 480 },
        height: { ideal: 360 },
        frameRate: { ideal: 15 }
      }
    };
    return constraints[quality] || constraints['SD'];
  }

  async handleConnectionStateChange(deviceId, peerConnection) {
    switch(peerConnection.connectionState) {
      case 'disconnected':
        this.cleanupConnection(deviceId);
        break;
      case 'failed':
        await this.reconnect(deviceId);
        break;
    }
  }

  async recordStream(deviceId, duration) {
    const stream = this.streams.get(deviceId);
    if (!stream) return null;

    const fileName = `${deviceId}_${Date.now()}.mp4`;
    const outputPath = `./recordings/${fileName}`;

    return new Promise((resolve, reject) => {
      ffmpeg(stream)
        .duration(duration)
        .output(outputPath)
        .on('end', () => resolve(fileName))
        .on('error', reject)
        .run();
    });
  }
}

module.exports = new VideoStreamService();
