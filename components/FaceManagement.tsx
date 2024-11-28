import React, { useState, useEffect, useRef } from 'react';
import { Camera, UserPlus, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import FacialRecognitionService from '../services/facial-recognition';

const FaceManagement = () => {
  const [faces, setFaces] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureQuality, setCaptureQuality] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Charger les visages enregistrés
    loadRegisteredFaces();
  }, []);

  const loadRegisteredFaces = async () => {
    try {
      const faceEntries = Array.from(FacialRecognitionService.faceDatabase.values());
      setFaces(faceEntries);
    } catch (error) {
      console.error('Erreur chargement visages:', error);
    }
  };

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280,
          height: 720,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Erreur accès caméra:', error);
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCaptureQuality(0);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    
    try {
      // Analyser la qualité de l'image
      const imageData = context.getImageData(
        0, 0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const processedFace = await FacialRecognitionService.processFace(imageData);
      if (processedFace.detected) {
        setCaptureQuality(processedFace.primaryFace.confidence);
      }
    } catch (error) {
      console.error('Erreur analyse image:', error);
    }
  };

  const registerNewFace = async () => {
    if (!canvasRef.current) return;

    try {
      const userData = {
        name: 'Nouveau Visage',
        createdAt: new Date(),
        accessLevel: 'standard'
      };

      const imageData = canvasRef.current.getContext('2d').getImageData(
        0, 0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const result = await FacialRecognitionService.registerFace(userData, imageData);
      
      if (result.status === 'registered') {
        await loadRegisteredFaces();
        stopCapture();
      }
    } catch (error) {
      console.error('Erreur enregistrement visage:', error);
    }
  };

  const deleteFace = async (faceId) => {
    try {
      await FacialRecognitionService.faceDatabase.delete(faceId);
      await loadRegisteredFaces();
    } catch (error) {
      console.error('Erreur suppression visage:', error);
    }
  };

  useEffect(() => {
    let frameCapture;
    if (isCapturing) {
      frameCapture = setInterval(captureFrame, 500);
    }
    return () => {
      if (frameCapture) clearInterval(frameCapture);
    };
  }, [isCapturing]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Visages</h1>
        {!isCapturing ? (
          <Button 
            onClick={startCapture}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un Visage
          </Button>
        ) : (
          <Button 
            onClick={stopCapture}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </Button>
        )}
      </div>

      {/* Zone de capture */}
      {isCapturing && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                  Qualité: {Math.round(captureQuality * 100)}%
                </div>
                {captureQuality > 0.7 && (
                  <Button
                    onClick={registerNewFace}
                    variant="success"
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des visages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faces.map(face => (
          <Card key={face.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>{face.userData.name}</span>
                <button
                  onClick={() => deleteFace(face.id)}
                  className="p-1 hover:bg-red-100 rounded-full text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Niveau d'accès</span>
                  <span className="font-medium">{face.userData.accessLevel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Enregistré le</span>
                  <span className="font-medium">
                    {new Date(face.registered).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dernière détection</span>
                  <span className="font-medium">
                    {face.lastSeen 
                      ? new Date(face.lastSeen).toLocaleDateString()
                      : 'Jamais'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Qualité</span>
                  <span className="font-medium">
                    {Math.round(face.quality * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FaceManagement;
