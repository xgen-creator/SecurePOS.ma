import React, { useState, useEffect } from 'react';
import { DeviceManager } from '../../../services/devices/DeviceManager';
import type { Scene } from '../../../services/automation/SceneActionService';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';
import { Plus, X } from 'lucide-react';

interface SceneEditorProps {
  scene?: Scene | null;
  onSave: (scene: Scene) => void;
  onCancel: () => void;
}

interface DeviceState {
  deviceId: string;
  state: any;
  transitionDuration?: number;
}

export default function SceneEditor({ scene, onSave, onCancel }: SceneEditorProps) {
  const [name, setName] = useState(scene?.name || '');
  const [description, setDescription] = useState(scene?.description || '');
  const [deviceStates, setDeviceStates] = useState<DeviceState[]>(
    scene?.deviceStates || []
  );
  const [priority, setPriority] = useState(scene?.priority || 1);
  const [tags, setTags] = useState<string[]>(scene?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => {
    // Charger la liste des appareils
    const deviceManager = DeviceManager.getInstance();
    setDevices(deviceManager.getAllDevices());
  }, []);

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddDevice = () => {
    if (selectedDeviceId && !deviceStates.find(ds => ds.deviceId === selectedDeviceId)) {
      const device = devices.find(d => d.id === selectedDeviceId);
      if (device) {
        setDeviceStates([
          ...deviceStates,
          {
            deviceId: device.id,
            state: device.getDefaultState(),
            transitionDuration: 0
          }
        ]);
      }
      setSelectedDeviceId('');
    }
  };

  const handleRemoveDevice = (deviceId: string) => {
    setDeviceStates(deviceStates.filter(ds => ds.deviceId !== deviceId));
  };

  const handleDeviceStateChange = (deviceId: string, property: string, value: any) => {
    setDeviceStates(prevStates =>
      prevStates.map(ds =>
        ds.deviceId === deviceId
          ? {
              ...ds,
              state: {
                ...ds.state,
                [property]: value
              }
            }
          : ds
      )
    );
  };

  const handleTransitionDurationChange = (deviceId: string, duration: number) => {
    setDeviceStates(prevStates =>
      prevStates.map(ds =>
        ds.deviceId === deviceId
          ? {
              ...ds,
              transitionDuration: duration
            }
          : ds
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      // TODO: Afficher une erreur
      return;
    }

    const newScene: Scene = {
      id: scene?.id || `scene_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      deviceStates,
      priority,
      tags
    };

    onSave(newScene);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la scène</Label>
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Mode Soirée"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description de la scène..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="Nouveau tag..."
            onKeyPress={e => e.key === 'Enter' && handleAddTag()}
          />
          <Button type="button" onClick={handleAddTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Priorité</Label>
        <Slider
          value={[priority]}
          onValueChange={([value]) => setPriority(value)}
          min={1}
          max={5}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>Basse</span>
          <span>Haute</span>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Appareils</Label>
        
        <div className="flex gap-2">
          <select
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
            className="flex-1 p-2 border rounded"
          >
            <option value="">Sélectionner un appareil...</option>
            {devices
              .filter(device => !deviceStates.find(ds => ds.deviceId === device.id))
              .map(device => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
          </select>
          <Button type="button" onClick={handleAddDevice}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {deviceStates.map(deviceState => {
            const device = devices.find(d => d.id === deviceState.deviceId);
            if (!device) return null;

            return (
              <div
                key={deviceState.deviceId}
                className="p-4 border rounded space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{device.name}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDevice(deviceState.deviceId)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {Object.entries(device.getControlProperties()).map(([property, config]: [string, any]) => (
                  <div key={property} className="space-y-2">
                    <Label>{config.label}</Label>
                    {config.type === 'boolean' ? (
                      <Switch
                        checked={deviceState.state[property] || false}
                        onCheckedChange={value =>
                          handleDeviceStateChange(deviceState.deviceId, property, value)
                        }
                      />
                    ) : config.type === 'number' ? (
                      <Slider
                        value={[deviceState.state[property] || config.min]}
                        onValueChange={([value]) =>
                          handleDeviceStateChange(deviceState.deviceId, property, value)
                        }
                        min={config.min}
                        max={config.max}
                        step={config.step}
                      />
                    ) : null}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Durée de transition (secondes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={deviceState.transitionDuration || 0}
                    onChange={e =>
                      handleTransitionDurationChange(
                        deviceState.deviceId,
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          {scene ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
