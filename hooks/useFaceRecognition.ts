import { useState, useEffect, useCallback, useRef } from 'react';
import FaceRecognitionService, {
  DetectedFace,
  FaceProfile,
  RecognitionOptions
} from '../services/recognition/FaceRecognitionService';
import SceneActionService from '../services/automation/SceneActionService';
import { useNotificationManager } from './useNotificationManager';

interface UseFaceRecognitionProps {
  onFaceDetected?: (faces: DetectedFace[]) => void;
  onProfilePresence?: (profile: FaceProfile) => void;
  onProfileAbsence?: (profile: FaceProfile) => void;
  presenceThreshold?: number;
  absenceThreshold?: number;
  options?: Partial<RecognitionOptions>;
}

export function useFaceRecognition({
  onFaceDetected,
  onProfilePresence,
  onProfileAbsence,
  presenceThreshold = 3000,
  absenceThreshold = 10000,
  options = {}
}: UseFaceRecognitionProps = {}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const presenceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const absenceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSeenProfiles = useRef<Set<string>>(new Set());

  const { sendNotification } = useNotificationManager();
  const recognitionService = FaceRecognitionService.getInstance();

  useEffect(() => {
    const initialize = async () => {
      try {
        await recognitionService.initialize();
        recognitionService.updateOptions(options);
        setProfiles(recognitionService.getAllProfiles());
        setIsInitialized(true);
      } catch (err) {
        setError('Failed to initialize face recognition');
        sendNotification(
          'Erreur de reconnaissance faciale',
          'Impossible d\'initialiser le service de reconnaissance faciale',
          { type: 'error', source: 'faceRecognition' }
        );
      }
    };

    initialize();

    const handleProfileChange = () => {
      setProfiles(recognitionService.getAllProfiles());
    };

    recognitionService.on('profileAdded', handleProfileChange);
    recognitionService.on('profileUpdated', handleProfileChange);
    recognitionService.on('profileDeleted', handleProfileChange);

    return () => {
      recognitionService.off('profileAdded', handleProfileChange);
      recognitionService.off('profileUpdated', handleProfileChange);
      recognitionService.off('profileDeleted', handleProfileChange);
    };
  }, []);

  const handlePresence = useCallback((profile: FaceProfile) => {
    // Annuler le timeout d'absence s'il existe
    const absenceTimeout = absenceTimeouts.current.get(profile.id);
    if (absenceTimeout) {
      clearTimeout(absenceTimeout);
      absenceTimeouts.current.delete(profile.id);
    }

    // Si le profil n'est pas déjà marqué comme présent
    if (!lastSeenProfiles.current.has(profile.id)) {
      const presenceTimeout = setTimeout(() => {
        lastSeenProfiles.current.add(profile.id);
        onProfilePresence?.(profile);

        // Activer les scènes associées
        if (profile.scenes?.length) {
          profile.scenes.forEach(sceneId => {
            SceneActionService.getInstance().activateScene(sceneId);
          });
        }

        // Exécuter les actions personnalisées
        if (profile.customActions?.onPresence?.length) {
          // TODO: Implémenter l'exécution des actions personnalisées
        }

        sendNotification(
          'Présence détectée',
          `${profile.name} est maintenant présent`,
          { type: 'info', source: 'faceRecognition' }
        );

        presenceTimeouts.current.delete(profile.id);
      }, presenceThreshold);

      presenceTimeouts.current.set(profile.id, presenceTimeout);
    }
  }, [presenceThreshold, onProfilePresence]);

  const handleAbsence = useCallback((profile: FaceProfile) => {
    // Annuler le timeout de présence s'il existe
    const presenceTimeout = presenceTimeouts.current.get(profile.id);
    if (presenceTimeout) {
      clearTimeout(presenceTimeout);
      presenceTimeouts.current.delete(profile.id);
    }

    // Si le profil est marqué comme présent
    if (lastSeenProfiles.current.has(profile.id)) {
      const absenceTimeout = setTimeout(() => {
        lastSeenProfiles.current.delete(profile.id);
        onProfileAbsence?.(profile);

        // Désactiver les scènes associées
        if (profile.scenes?.length) {
          profile.scenes.forEach(sceneId => {
            SceneActionService.getInstance().deactivateScene(sceneId);
          });
        }

        // Exécuter les actions personnalisées
        if (profile.customActions?.onAbsence?.length) {
          // TODO: Implémenter l'exécution des actions personnalisées
        }

        sendNotification(
          'Absence détectée',
          `${profile.name} n'est plus présent`,
          { type: 'info', source: 'faceRecognition' }
        );

        absenceTimeouts.current.delete(profile.id);
      }, absenceThreshold);

      absenceTimeouts.current.set(profile.id, absenceTimeout);
    }
  }, [absenceThreshold, onProfileAbsence]);

  const processFrame = useCallback(async (
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ) => {
    if (!isInitialized || isProcessing) return;

    try {
      setIsProcessing(true);
      const faces = await recognitionService.detectFaces(input);
      setDetectedFaces(faces);
      onFaceDetected?.(faces);

      // Gérer la présence/absence pour chaque profil
      const detectedIds = new Set(faces.map(face => face.id).filter(Boolean));
      
      // Vérifier les présences
      faces.forEach(face => {
        if (face.id) {
          const profile = recognitionService.getProfile(face.id);
          if (profile) {
            handlePresence(profile);
          }
        }
      });

      // Vérifier les absences
      profiles.forEach(profile => {
        if (!detectedIds.has(profile.id)) {
          handleAbsence(profile);
        }
      });

    } catch (err) {
      setError('Face detection failed');
      sendNotification(
        'Erreur de détection',
        'La détection des visages a échoué',
        { type: 'error', source: 'faceRecognition' }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isInitialized, isProcessing, profiles, handlePresence, handleAbsence, onFaceDetected]);

  const addProfile = useCallback(async (
    name: string,
    descriptors: Float32Array[],
    thumbnail?: string
  ) => {
    try {
      const profile = await recognitionService.addProfile(name, descriptors, thumbnail);
      sendNotification(
        'Profil ajouté',
        `Le profil de ${name} a été créé avec succès`,
        { type: 'success', source: 'faceRecognition' }
      );
      return profile;
    } catch (err) {
      setError('Failed to add profile');
      sendNotification(
        'Erreur',
        'Impossible d\'ajouter le profil',
        { type: 'error', source: 'faceRecognition' }
      );
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (
    id: string,
    updates: Partial<FaceProfile>
  ) => {
    try {
      const profile = await recognitionService.updateProfile(id, updates);
      if (profile) {
        sendNotification(
          'Profil mis à jour',
          `Le profil de ${profile.name} a été mis à jour`,
          { type: 'success', source: 'faceRecognition' }
        );
      }
      return profile;
    } catch (err) {
      setError('Failed to update profile');
      sendNotification(
        'Erreur',
        'Impossible de mettre à jour le profil',
        { type: 'error', source: 'faceRecognition' }
      );
      return null;
    }
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    try {
      const success = await recognitionService.deleteProfile(id);
      if (success) {
        sendNotification(
          'Profil supprimé',
          'Le profil a été supprimé avec succès',
          { type: 'success', source: 'faceRecognition' }
        );
      }
      return success;
    } catch (err) {
      setError('Failed to delete profile');
      sendNotification(
        'Erreur',
        'Impossible de supprimer le profil',
        { type: 'error', source: 'faceRecognition' }
      );
      return false;
    }
  }, []);

  return {
    isInitialized,
    isProcessing,
    detectedFaces,
    profiles,
    error,
    processFrame,
    addProfile,
    updateProfile,
    deleteProfile
  };
}
