import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SceneActionService, { Scene } from '../../services/automation/SceneActionService';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../common/Button';

interface SceneSelectorProps {
  selectedScenes: string[];
  onScenesChange: (scenes: string[]) => void;
  mode?: 'presence' | 'absence';
  title?: string;
}

export function SceneSelector({
  selectedScenes,
  onScenesChange,
  mode = 'presence',
  title
}: SceneSelectorProps) {
  const [availableScenes, setAvailableScenes] = useState<Scene[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const scenes = SceneActionService.getAllScenes();
    setAvailableScenes(scenes);

    const handleSceneChange = () => {
      setAvailableScenes(SceneActionService.getAllScenes());
    };

    SceneActionService.on('sceneAdded', handleSceneChange);
    SceneActionService.on('sceneRemoved', handleSceneChange);
    SceneActionService.on('sceneUpdated', handleSceneChange);

    return () => {
      SceneActionService.off('sceneAdded', handleSceneChange);
      SceneActionService.off('sceneRemoved', handleSceneChange);
      SceneActionService.off('sceneUpdated', handleSceneChange);
    };
  }, []);

  const toggleScene = (sceneId: string) => {
    const newSelection = selectedScenes.includes(sceneId)
      ? selectedScenes.filter(id => id !== sceneId)
      : [...selectedScenes, sceneId];
    
    onScenesChange(newSelection);
  };

  const renderScene = (scene: Scene) => {
    const isSelected = selectedScenes.includes(scene.id);
    
    return (
      <TouchableOpacity
        key={scene.id}
        style={[
          styles.sceneItem,
          {
            backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border
          }
        ]}
        onPress={() => toggleScene(scene.id)}
      >
        <View style={styles.sceneInfo}>
          <Text style={[styles.sceneName, { color: theme.colors.text }]}>
            {scene.name}
          </Text>
          {scene.description && (
            <Text style={[styles.sceneDescription, { color: theme.colors.text + '80' }]}>
              {scene.description}
            </Text>
          )}
          {scene.tags && scene.tags.length > 0 && (
            <View style={styles.tagContainer}>
              {scene.tags.map(tag => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}
                >
                  <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <MaterialIcons
          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={isSelected ? theme.colors.primary : theme.colors.text}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      )}
      
      {selectedScenes.length > 0 ? (
        <ScrollView style={styles.selectedContainer}>
          {availableScenes
            .filter(scene => selectedScenes.includes(scene.id))
            .map(renderScene)}
        </ScrollView>
      ) : (
        <Text style={[styles.emptyText, { color: theme.colors.text + '80' }]}>
          Aucune scène sélectionnée
        </Text>
      )}

      <Button
        title={isSelecting ? 'Terminer' : 'Sélectionner des scènes'}
        icon={isSelecting ? 'check' : 'add'}
        onPress={() => setIsSelecting(!isSelecting)}
        style={styles.addButton}
      />

      {isSelecting && (
        <ScrollView style={styles.selectorContainer}>
          {availableScenes
            .filter(scene => !selectedScenes.includes(scene.id))
            .map(renderScene)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 100,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  selectedContainer: {
    maxHeight: 200,
  },
  selectorContainer: {
    maxHeight: 300,
    marginTop: 10,
  },
  sceneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  sceneInfo: {
    flex: 1,
    marginRight: 10,
  },
  sceneName: {
    fontSize: 16,
    fontWeight: '500',
  },
  sceneDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  addButton: {
    marginVertical: 10,
  },
});
