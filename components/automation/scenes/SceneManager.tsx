import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power } from 'lucide-react';
import SceneActionService, { Scene } from '../../../services/automation/SceneActionService';
import NotificationService from '../../../services/automation/NotificationService';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import SceneEditor from './SceneEditor';

export default function SceneManager() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    // Charger les scènes
    const loadScenes = () => {
      const allScenes = SceneActionService.getAllScenes();
      setScenes(allScenes);
      setActiveSceneId(SceneActionService.getActiveScene());
    };

    loadScenes();

    // Écouter les changements
    const handleSceneChange = () => loadScenes();
    SceneActionService.on('sceneActivated', handleSceneChange);
    SceneActionService.on('sceneDeactivated', handleSceneChange);
    SceneActionService.on('sceneAdded', handleSceneChange);
    SceneActionService.on('sceneRemoved', handleSceneChange);
    SceneActionService.on('sceneUpdated', handleSceneChange);

    return () => {
      SceneActionService.off('sceneActivated', handleSceneChange);
      SceneActionService.off('sceneDeactivated', handleSceneChange);
      SceneActionService.off('sceneAdded', handleSceneChange);
      SceneActionService.off('sceneRemoved', handleSceneChange);
      SceneActionService.off('sceneUpdated', handleSceneChange);
    };
  }, []);

  const handleActivateScene = async (scene: Scene) => {
    try {
      const success = await SceneActionService.activateScene(scene.id);
      if (success) {
        NotificationService.sendNotification({
          title: 'Scène activée',
          message: `La scène "${scene.name}" a été activée avec succès.`,
          type: 'success',
          source: 'scenes',
          priority: 1
        });
      } else {
        throw new Error('Échec de l\'activation');
      }
    } catch (error) {
      NotificationService.sendNotification({
        title: 'Erreur d\'activation',
        message: `Impossible d'activer la scène "${scene.name}".`,
        type: 'error',
        source: 'scenes',
        priority: 2
      });
    }
  };

  const handleDeactivateScene = async (scene: Scene) => {
    try {
      const success = await SceneActionService.deactivateScene(scene.id);
      if (success) {
        NotificationService.sendNotification({
          title: 'Scène désactivée',
          message: `La scène "${scene.name}" a été désactivée.`,
          type: 'info',
          source: 'scenes',
          priority: 1
        });
      }
    } catch (error) {
      NotificationService.sendNotification({
        title: 'Erreur de désactivation',
        message: `Impossible de désactiver la scène "${scene.name}".`,
        type: 'error',
        source: 'scenes',
        priority: 2
      });
    }
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setIsEditorOpen(true);
  };

  const handleDeleteScene = async (scene: Scene) => {
    try {
      SceneActionService.removeScene(scene.id);
      NotificationService.sendNotification({
        title: 'Scène supprimée',
        message: `La scène "${scene.name}" a été supprimée.`,
        type: 'info',
        source: 'scenes',
        priority: 1
      });
    } catch (error) {
      NotificationService.sendNotification({
        title: 'Erreur de suppression',
        message: `Impossible de supprimer la scène "${scene.name}".`,
        type: 'error',
        source: 'scenes',
        priority: 2
      });
    }
  };

  const handleCreateScene = () => {
    setEditingScene(null);
    setIsEditorOpen(true);
  };

  const handleSaveScene = async (scene: Scene) => {
    try {
      if (editingScene) {
        SceneActionService.updateScene(scene);
      } else {
        SceneActionService.addScene(scene);
      }
      setIsEditorOpen(false);
      NotificationService.sendNotification({
        title: 'Scène sauvegardée',
        message: `La scène "${scene.name}" a été ${editingScene ? 'mise à jour' : 'créée'}.`,
        type: 'success',
        source: 'scenes',
        priority: 1
      });
    } catch (error) {
      NotificationService.sendNotification({
        title: 'Erreur de sauvegarde',
        message: `Impossible de sauvegarder la scène "${scene.name}".`,
        type: 'error',
        source: 'scenes',
        priority: 2
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Scènes</h2>
        <Button onClick={handleCreateScene} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle scène
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map(scene => (
          <Card key={scene.id} className={
            activeSceneId === scene.id ? 'border-primary' : ''
          }>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">{scene.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditScene(scene)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteScene(scene)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scene.description && (
                  <p className="text-sm text-gray-500">{scene.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {scene.tags?.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {scene.deviceStates.length} appareil(s)
                  </span>
                  <Button
                    variant={activeSceneId === scene.id ? "destructive" : "default"}
                    size="sm"
                    onClick={() => 
                      activeSceneId === scene.id
                        ? handleDeactivateScene(scene)
                        : handleActivateScene(scene)
                    }
                    className="flex items-center gap-2"
                  >
                    <Power className="w-4 h-4" />
                    {activeSceneId === scene.id ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScene ? 'Modifier la scène' : 'Nouvelle scène'}
            </DialogTitle>
          </DialogHeader>
          <SceneEditor
            scene={editingScene}
            onSave={handleSaveScene}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
