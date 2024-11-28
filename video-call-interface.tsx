import React, { useState, useEffect } from 'react';
import { Camera, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Share, Volume2, Volume1, VolumeX } from 'lucide-react';

const VideoCallInterface = () => {
  const [callState, setCallState] = useState({
    isConnected: true,
    isMuted: false,
    isVideoEnabled: true,
    isSpeakerOn: true,
    duration: 0
  });

  const [quality, setQuality] = useState({
    video: 'HD',
    connection: 'good',
    bandwidth: 2.5 // Mbps
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCallState(prev => ({
        ...prev,
        duration: prev.duration + 1
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-gray-900 relative">
      {/* Zone de vidéo principale */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-black">
          {/* Placeholder pour le flux vidéo principal */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-lg text-white text-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              quality.connection === 'good' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            {quality.video} | {quality.bandwidth} Mbps
          </div>
        </div>
      </div>

      {/* Vidéo miniature (preview) */}
      <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden">
        <div className="w-full h-full bg-black"></div>
      </div>

      {/* Contrôles d'appel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
        <div className="max-w-3xl mx-auto">
          {/* Durée d'appel */}
          <div className="text-center text-white mb-4">
            {formatDuration(callState.duration)}
          </div>

          {/* Boutons de contrôle */}
          <div className="flex justify-center items-center gap-4">
            <button 
              className={`p-4 rounded-full ${
                callState.isMuted ? 'bg-red-500' : 'bg-gray-600'
              } hover:bg-opacity-80 transition-colors`}
              onClick={() => setCallState(prev => ({
                ...prev,
                isMuted: !prev.isMuted
              }))}
            >
              {callState.isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            <button 
              className={`p-4 rounded-full ${
                callState.isVideoEnabled ? 'bg-gray-600' : 'bg-red-500'
              } hover:bg-opacity-80 transition-colors`}
              onClick={() => setCallState(prev => ({
                ...prev,
                isVideoEnabled: !prev.isVideoEnabled
              }))}
            >
              {callState.isVideoEnabled ? (
                <Camera className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>

            <button 
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              onClick={() => console.log('Terminer appel')}
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            <button 
              className="p-4 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors"
              onClick={() => console.log('Ouvrir chat')}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </button>

            <button 
              className={`p-4 rounded-full ${
                callState.isSpeakerOn ? 'bg-gray-600' : 'bg-gray-700'
              } hover:bg-opacity-80 transition-colors`}
              onClick={() => setCallState(prev => ({
                ...prev,
                isSpeakerOn: !prev.isSpeakerOn
              }))}
            >
              {callState.isSpeakerOn ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : (
                <VolumeX className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Indicateurs d'état */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
        <div className="text-white text-sm flex items-center gap-2">
          <div className="animate-pulse w-2 h-2 rounded-full bg-green-500" />
          Appel en cours
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;
