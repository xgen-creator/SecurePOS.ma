import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { Camera, Mic, Phone, Video, Sun } from 'lucide-react';

interface VideoCallProps {
    callId: string;
    userId: string;
    onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ callId, userId, onEndCall }) => {
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor'>('good');
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    
    const socket = useSocket();
    const deviceInfo = useDeviceInfo();

    useEffect(() => {
        initializeCall();
        return () => cleanupCall();
    }, []);

    const initializeCall = async () => {
        try {
            // Initialiser la connexion WebRTC
            peerConnection.current = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Obtenir le flux média local
            localStream.current = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            // Afficher le flux vidéo local
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream.current;
            }

            // Ajouter les tracks au peer connection
            localStream.current.getTracks().forEach(track => {
                if (localStream.current && peerConnection.current) {
                    peerConnection.current.addTrack(track, localStream.current);
                }
            });

            // Gérer les événements WebRTC
            setupWebRTCHandlers();
            
            // Rejoindre l'appel
            socket.emit('join-call', {
                callId,
                userId,
                deviceCapabilities: deviceInfo
            });
        } catch (error) {
            console.error('Erreur initialisation appel:', error);
        }
    };

    const setupWebRTCHandlers = () => {
        if (!peerConnection.current) return;

        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    callId,
                    candidate: event.candidate
                });
            }
        };

        peerConnection.current.onconnectionstatechange = () => {
            const quality = assessConnectionQuality();
            setConnectionQuality(quality);
            
            socket.emit('connection-quality', {
                callId,
                stats: {
                    state: peerConnection.current?.connectionState,
                    quality
                }
            });
        };
    };

    const assessConnectionQuality = () => {
        if (!peerConnection.current) return 'good';
        
        const state = peerConnection.current.connectionState;
        if (state === 'connected' || state === 'completed') return 'good';
        if (state === 'connecting') return 'medium';
        return 'poor';
    };

    const toggleCamera = () => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            videoTrack.enabled = !isCameraOn;
            setIsCameraOn(!isCameraOn);
            
            socket.emit('toggle-camera', {
                callId,
                enabled: !isCameraOn
            });
        }
    };

    const toggleMic = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            audioTrack.enabled = !isMicOn;
            setIsMicOn(!isMicOn);
        }
    };

    const toggleFlash = async () => {
        try {
            const track = localStream.current?.getVideoTracks()[0];
            if (track) {
                const capabilities = track.getCapabilities();
                if (capabilities.torch) {
                    await track.applyConstraints({
                        advanced: [{ torch: !isFlashOn }]
                    });
                    setIsFlashOn(!isFlashOn);
                    
                    socket.emit('toggle-flash', {
                        callId,
                        enabled: !isFlashOn
                    });
                }
            }
        } catch (error) {
            console.error('Erreur flash:', error);
        }
    };

    const cleanupCall = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
        }
        if (peerConnection.current) {
            peerConnection.current.close();
        }
    };

    return (
        <div className="relative h-full bg-gray-900">
            {/* Vidéo distante */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            
            {/* Vidéo locale (petite fenêtre) */}
            <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-lg overflow-hidden">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Indicateur de qualité */}
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
                connectionQuality === 'good' ? 'bg-green-500' :
                connectionQuality === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
                {connectionQuality}
            </div>

            {/* Contrôles */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-full ${isCameraOn ? 'bg-blue-500' : 'bg-red-500'}`}
                >
                    <Camera className="w-6 h-6 text-white" />
                </button>
                
                <button
                    onClick={toggleMic}
                    className={`p-4 rounded-full ${isMicOn ? 'bg-blue-500' : 'bg-red-500'}`}
                >
                    <Mic className="w-6 h-6 text-white" />
                </button>
                
                <button
                    onClick={onEndCall}
                    className="p-4 rounded-full bg-red-500"
                >
                    <Phone className="w-6 h-6 text-white" />
                </button>
                
                <button
                    onClick={toggleFlash}
                    className={`p-4 rounded-full ${isFlashOn ? 'bg-yellow-500' : 'bg-gray-500'}`}
                >
                    <Sun className="w-6 h-6 text-white" />
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
