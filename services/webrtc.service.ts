import { config } from '../config';
import { EventEmitter } from 'events';

class WebRTCService extends EventEmitter {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private dataChannel: RTCDataChannel | null = null;

    constructor() {
        super();
        this.initializePeerConnection();
    }

    private initializePeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: config.webrtc.iceServers
        });

        // Gestion des événements ICE
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.emit('iceCandidate', event.candidate);
            }
        };

        // Gestion du flux distant
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.emit('remoteStream', this.remoteStream);
        };

        // Canal de données pour les messages
        this.dataChannel = this.peerConnection.createDataChannel('messageChannel');
        this.setupDataChannel(this.dataChannel);
    }

    private setupDataChannel(channel: RTCDataChannel) {
        channel.onopen = () => {
            console.log('Canal de données ouvert');
            this.emit('dataChannelOpen');
        };

        channel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.emit('message', message);
        };

        channel.onclose = () => {
            console.log('Canal de données fermé');
            this.emit('dataChannelClose');
        };
    }

    async startLocalStream(): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: true
            });

            // Ajout des pistes au peer connection
            this.localStream.getTracks().forEach(track => {
                if (this.peerConnection && this.localStream) {
                    this.peerConnection.addTrack(track, this.localStream);
                }
            });

            return this.localStream;
        } catch (error) {
            console.error('Erreur lors de l\'accès à la caméra:', error);
            throw error;
        }
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Connexion WebRTC non initialisée');
        }

        const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Connexion WebRTC non initialisée');
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Connexion WebRTC non initialisée');
        }

        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    sendMessage(message: any): void {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }

    closeConnection(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.emit('connectionClosed');
    }

    // Méthodes pour la gestion de la qualité vidéo
    async adjustVideoQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
        if (!this.localStream) return;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const constraints: MediaTrackConstraints = {
            width: { ideal: quality === 'high' ? 1280 : quality === 'medium' ? 720 : 480 },
            height: { ideal: quality === 'high' ? 720 : quality === 'medium' ? 480 : 360 },
            frameRate: { ideal: quality === 'high' ? 30 : quality === 'medium' ? 24 : 15 }
        };

        await videoTrack.applyConstraints(constraints);
    }

    // Méthodes pour la gestion des erreurs de connexion
    async handleConnectionFailure(): Promise<void> {
        this.closeConnection();
        this.initializePeerConnection();
        await this.startLocalStream();
        this.emit('connectionRetry');
    }
}

export const webRTCService = new WebRTCService();
