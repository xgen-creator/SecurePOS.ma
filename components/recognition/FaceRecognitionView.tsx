import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import { DetectedFace } from '../../services/recognition/FaceRecognitionService';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ProfileEditor } from './ProfileEditor';

interface FaceRecognitionViewProps {
  onFaceDetected?: (faces: DetectedFace[]) => void;
  style?: any;
}

export function FaceRecognitionView({
  onFaceDetected,
  style
}: FaceRecognitionViewProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [selectedFace, setSelectedFace] = useState<DetectedFace | null>(null);
  
  const cameraRef = useRef<Camera | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useTheme();

  const {
    isInitialized,
    isProcessing,
    detectedFaces,
    profiles,
    processFrame,
    addProfile,
    updateProfile,
    deleteProfile
  } = useFaceRecognition({
    onFaceDetected,
    presenceThreshold: 3000,
    absenceThreshold: 10000,
    options: {
      minConfidence: 0.5,
      detectAge: true,
      detectGender: true,
      detectExpressions: true
    }
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        detectedFaces.forEach(face => {
          const { box } = face;
          ctx.strokeStyle = face.id ? theme.colors.success : theme.colors.primary;
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          if (face.name) {
            ctx.fillStyle = theme.colors.text;
            ctx.font = '14px Arial';
            ctx.fillText(face.name, box.x, box.y - 5);
          }
        });
      }
    }
  }, [detectedFaces, theme]);

  const handleCameraStream = async (frame: any) => {
    if (!isActive || !isInitialized || isProcessing) return;
    await processFrame(frame);
  };

  const handleFacesDetected = ({ faces }: { faces: any[] }) => {
    if (Platform.OS !== 'web') {
      // Traitement natif pour iOS/Android
      handleCameraStream(faces);
    }
  };

  const captureFrame = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true
      });
      
      if (selectedFace) {
        setShowProfileEditor(true);
      }
    }
  };

  const handleFaceClick = (face: DetectedFace) => {
    setSelectedFace(face);
    if (!face.id) {
      captureFrame();
    }
  };

  if (hasCameraPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasCameraPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={[styles.container, style]}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}
      >
        {Platform.OS === 'web' && (
          <canvas
            ref={canvasRef}
            style={StyleSheet.absoluteFill}
          />
        )}
        
        <View style={styles.overlay}>
          {detectedFaces.map((face, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.faceBox,
                {
                  left: face.box.x,
                  top: face.box.y,
                  width: face.box.width,
                  height: face.box.height,
                  borderColor: face.id ? theme.colors.success : theme.colors.primary
                }
              ]}
              onPress={() => handleFaceClick(face)}
            >
              {face.name && (
                <Text style={styles.faceName}>{face.name}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Camera>

      <View style={styles.controls}>
        <Button
          icon="power-settings-new"
          onPress={() => setIsActive(!isActive)}
          style={[
            styles.controlButton,
            { backgroundColor: isActive ? theme.colors.success : theme.colors.error }
          ]}
        />
        <Button
          icon="person-add"
          onPress={() => setShowProfileEditor(true)}
          style={styles.controlButton}
        />
        <Button
          icon="settings"
          onPress={() => {/* TODO: Implémenter les paramètres */}}
          style={styles.controlButton}
        />
      </View>

      <Modal
        visible={showProfileEditor}
        onClose={() => {
          setShowProfileEditor(false);
          setSelectedFace(null);
        }}
      >
        <ProfileEditor
          face={selectedFace}
          onSave={async (name, descriptors, thumbnail) => {
            if (selectedFace?.id) {
              await updateProfile(selectedFace.id, { name });
            } else {
              await addProfile(name, descriptors, thumbnail);
            }
            setShowProfileEditor(false);
            setSelectedFace(null);
          }}
          onDelete={async () => {
            if (selectedFace?.id) {
              await deleteProfile(selectedFace.id);
            }
            setShowProfileEditor(false);
            setSelectedFace(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
  },
  faceName: {
    position: 'absolute',
    top: -20,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: 2,
    fontSize: 12,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
