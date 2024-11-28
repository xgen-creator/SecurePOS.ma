import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DetectedFace } from '../../services/recognition/FaceRecognitionService';
import { Button } from '../common/Button';
import { useTheme } from '../../hooks/useTheme';
import { SceneSelector } from '../automation/scenes/SceneSelector';

interface ProfileEditorProps {
  face?: DetectedFace | null;
  onSave: (name: string, descriptors: Float32Array[], thumbnail?: string) => void;
  onDelete?: () => void;
}

export function ProfileEditor({
  face,
  onSave,
  onDelete
}: ProfileEditorProps) {
  const [name, setName] = useState(face?.name || '');
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [customActions, setCustomActions] = useState<{
    onPresence: string[];
    onAbsence: string[];
  }>({
    onPresence: [],
    onAbsence: []
  });

  const theme = useTheme();

  useEffect(() => {
    if (face?.name) {
      setName(face.name);
    }
  }, [face]);

  const handleSave = () => {
    if (!name.trim()) return;

    const descriptors = face ? [face.descriptor] : [];
    onSave(name.trim(), descriptors, thumbnail);
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      // Implémentation web de la sélection d'image
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setThumbnail(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      // TODO: Implémenter la sélection d'image pour mobile
      // Utiliser expo-image-picker
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {face?.id ? 'Modifier le profil' : 'Nouveau profil'}
        </Text>
        {face?.id && onDelete && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
            onPress={onDelete}
          >
            <MaterialIcons name="delete" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        <View style={styles.imageContainer}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.colors.border }]}>
              <MaterialIcons name="person" size={48} color={theme.colors.text} />
            </View>
          )}
          <Button
            title="Choisir une photo"
            icon="photo-camera"
            onPress={handleImagePick}
            style={styles.imageButton}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Nom</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card
              }
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Entrez un nom"
            placeholderTextColor={theme.colors.text + '80'}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Scènes associées
          </Text>
          <SceneSelector
            selectedScenes={selectedScenes}
            onScenesChange={setSelectedScenes}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Actions personnalisées
          </Text>
          
          <View style={styles.actionSection}>
            <Text style={[styles.subTitle, { color: theme.colors.text }]}>
              À la détection
            </Text>
            {/* TODO: Implémenter l'éditeur d'actions personnalisées */}
          </View>

          <View style={styles.actionSection}>
            <Text style={[styles.subTitle, { color: theme.colors.text }]}>
              À l'absence
            </Text>
            {/* TODO: Implémenter l'éditeur d'actions personnalisées */}
          </View>
        </View>

        <Button
          title="Enregistrer"
          onPress={handleSave}
          disabled={!name.trim()}
          style={[
            styles.saveButton,
            { backgroundColor: name.trim() ? theme.colors.primary : theme.colors.border }
          ]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  form: {
    gap: 20,
  },
  imageContainer: {
    alignItems: 'center',
    gap: 10,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    gap: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionSection: {
    gap: 5,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 12,
  },
});
