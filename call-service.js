// callService.js
class CallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isCallInProgress = false;
  }

  async initializeCall(deviceId) {
    try {
      // Configuration ICE servers
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
      this.peerConnection = new RTCPeerConnection(configuration);

      // Obtenir le flux média local
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      // Ajouter les tracks au peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Gérer le flux distant
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStreamUpdate?.(this.remoteStream);
      };

      // Gérer les changements d'état de connexion
      this.peerConnection.onconnectionstatechange = () => {
        this.handleConnectionStateChange();
      };

      this.isCallInProgress = true;
      return true;
    } catch (error) {
      console.error('Erreur initialisation appel:', error);
      return false;
    }
  }

  async handleConnectionStateChange() {
    const state = this.peerConnection.connectionState;
    switch (state) {
      case 'connected':
        this.startCallQualityMonitoring();
        break;
      case 'disconnected':
      case 'failed':
        await this.handleConnectionFailure();
        break;
      case 'closed':
        this.cleanupCall();
        break;
    }
  }

  async startCallQualityMonitoring() {
    setInterval(async () => {
      if (!this.peerConnection) return;

      const stats = await this.peerConnection.getStats();
      let videoBandwidth = 0;
      let packetsLost = 0;

      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
          videoBandwidth = stat.bytesReceived * 8 / 1000000; // Mbps
          packetsLost = stat.packetsLost;
        }
      });

      this.onQualityUpdate?.({
        bandwidth: videoBandwidth,
        packetsLost: packetsLost,
        quality: this.determineVideoQuality(videoBandwidth)
      });
    }, 1000);
  }

  determineVideoQuality(bandwidth) {
    if (bandwidth >= 2.5) return 'HD';
    if (bandwidth >= 1.5) return 'SD';
    return 'LOW';
  }

  async toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async endCall() {
    try {
      this.isCallInProgress = false;
      
      // Arrêter tous les tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      // Fermer la connexion peer
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      this.cleanupCall();
      return true;
    } catch (error) {
      console.error('Erreur fin appel:', error);
      return false;
    }
  }

  cleanupCall() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallInProgress = false;
  }
}

export default new CallService();
