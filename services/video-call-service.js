const WebRTC = require('webrtc');
const socketIO = require('socket.io');
const mediaProcessor = require('./media-processor');

class VideoCallService {
    constructor(server) {
        this.io = socketIO(server);
        this.activeConnections = new Map();
        this.callSettings = new Map();
        
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            socket.on('join-call', async (data) => {
                const { userId, callId, deviceCapabilities } = data;
                
                // Configurer la qualité vidéo en fonction des capacités
                const settings = this.optimizeVideoSettings(deviceCapabilities);
                this.callSettings.set(socket.id, settings);
                
                // Rejoindre la salle d'appel
                socket.join(`call:${callId}`);
                this.activeConnections.set(socket.id, { userId, callId });
                
                // Notifier les autres participants
                socket.to(`call:${callId}`).emit('user-joined', {
                    userId,
                    settings: settings.video
                });
            });

            socket.on('video-offer', async (data) => {
                const { targetUserId, sdp } = data;
                const callInfo = this.activeConnections.get(socket.id);
                
                if (callInfo) {
                    this.io.to(`user:${targetUserId}`).emit('video-offer', {
                        fromUserId: callInfo.userId,
                        sdp
                    });
                }
            });

            socket.on('video-answer', (data) => {
                const { targetUserId, sdp } = data;
                this.io.to(`user:${targetUserId}`).emit('video-answer', {
                    fromUserId: this.activeConnections.get(socket.id)?.userId,
                    sdp
                });
            });

            socket.on('ice-candidate', (data) => {
                const { targetUserId, candidate } = data;
                this.io.to(`user:${targetUserId}`).emit('ice-candidate', {
                    fromUserId: this.activeConnections.get(socket.id)?.userId,
                    candidate
                });
            });

            socket.on('toggle-camera', (data) => {
                const { callId, enabled } = data;
                socket.to(`call:${callId}`).emit('remote-camera-toggle', {
                    userId: this.activeConnections.get(socket.id)?.userId,
                    enabled
                });
            });

            socket.on('toggle-flash', (data) => {
                const { callId, enabled } = data;
                socket.to(`call:${callId}`).emit('remote-flash-toggle', {
                    userId: this.activeConnections.get(socket.id)?.userId,
                    enabled
                });
            });

            socket.on('connection-quality', (data) => {
                const { callId, stats } = data;
                const settings = this.adjustVideoQuality(stats, this.callSettings.get(socket.id));
                
                socket.emit('quality-update', settings);
            });

            socket.on('disconnect', () => {
                const callInfo = this.activeConnections.get(socket.id);
                if (callInfo) {
                    socket.to(`call:${callInfo.callId}`).emit('user-left', {
                        userId: callInfo.userId
                    });
                    this.activeConnections.delete(socket.id);
                    this.callSettings.delete(socket.id);
                }
            });
        });
    }

    optimizeVideoSettings(deviceCapabilities) {
        const { bandwidth, cpu, battery, camera } = deviceCapabilities;
        
        let settings = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: camera.facingMode || 'user'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        // Ajuster en fonction de la bande passante
        if (bandwidth < 1000) { // moins de 1 Mbps
            settings.video.width.ideal = 640;
            settings.video.height.ideal = 480;
            settings.video.frameRate.ideal = 20;
        }

        // Ajuster en fonction de la batterie
        if (battery < 20) {
            settings.video.frameRate.ideal = Math.min(settings.video.frameRate.ideal, 15);
        }

        return settings;
    }

    adjustVideoQuality(stats, currentSettings) {
        const { packetsLost, jitter, roundTripTime } = stats;
        let settings = { ...currentSettings };

        // Ajuster la qualité en fonction des statistiques réseau
        if (packetsLost > 5 || roundTripTime > 300) {
            settings.video.width.ideal = Math.max(320, settings.video.width.ideal / 2);
            settings.video.height.ideal = Math.max(240, settings.video.height.ideal / 2);
            settings.video.frameRate.ideal = Math.max(10, settings.video.frameRate.ideal - 5);
        }

        return settings;
    }

    async startCall(userId, targetUserId) {
        const callId = `call_${Date.now()}_${userId}_${targetUserId}`;
        
        // Créer une nouvelle salle d'appel
        await this.io.in(`user:${targetUserId}`).socketsJoin(`call:${callId}`);
        
        return callId;
    }

    async endCall(callId) {
        // Notifier tous les participants de la fin de l'appel
        this.io.to(`call:${callId}`).emit('call-ended');
        
        // Nettoyer les ressources
        const sockets = await this.io.in(`call:${callId}`).fetchSockets();
        sockets.forEach(socket => {
            this.activeConnections.delete(socket.id);
            this.callSettings.delete(socket.id);
            socket.leave(`call:${callId}`);
        });
    }
}

module.exports = VideoCallService;
