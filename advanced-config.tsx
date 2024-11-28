import React, { useState } from 'react';
import { Settings, Shield, Network, Database, Bell, Cloud, Camera, Lock } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const AdvancedConfig = () => {
  const [config, setConfig] = useState({
    security: {
      twoFactorAuth: true,
      passwordPolicy: 'strong',
      sessionTimeout: 30,
      ipWhitelist: []
    },
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      }
    },
    video: {
      quality: 'HD',
      compression: 0.8,
      nightMode: true,
      motionSensitivity: 0.7
    },
    storage: {
      retentionDays: 30,
      autoCleanup: true,
      backupEnabled: true,
      compressionLevel: 'medium'
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuration Avancée</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Authentification à deux facteurs</h3>
                  <p className="text-sm text-gray-500">Renforce la sécurité du compte</p>
                </div>
                <Switch 
                  checked={config.security.twoFactorAuth}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      security: { ...prev.security, twoFactorAuth: checked }
                    }))
                  }
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Politique de mot de passe</h3>
                <select 
                  className="w-full p-2 border rounded"
                  value={config.security.passwordPolicy}
                  onChange={(e) => 
                    setConfig(prev => ({
                      ...prev,
                      security: { ...prev.security, passwordPolicy: e.target.value }
                    }))
                  }
                >
                  <option value="basic">Basique</option>
                  <option value="medium">Moyen</option>
                  <option value="strong">Fort</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vidéo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Configuration Vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Qualité Vidéo</h3>
                <select 
                  className="w-full p-2 border rounded"
                  value={config.video.quality}
                  onChange={(e) => 
                    setConfig(prev => ({
                      ...prev,
                      video: { ...prev.video, quality: e.target.value }
                    }))
                  }
                >
                  <option value="SD">SD (480p)</option>
                  <option value="HD">HD (720p)</option>
                  <option value="FHD">Full HD (1080p)</option>
                </select>
              </div>

              <div>
                <h3 className="font-medium mb-2">Sensibilité de mouvement</h3>
                <Slider
                  value={[config.video.motionSensitivity * 100]}
                  max={100}
                  step={1}
                  className="w-full"
                  onValueChange={(value) => 
                    setConfig(prev => ({
                      ...prev,
                      video: { ...prev.video, motionSensitivity: value[0] / 100 }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stockage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Stockage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Période de rétention (jours)</h3>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={config.storage.retentionDays}
                  onChange={(e) => 
                    setConfig(prev => ({
                      ...prev,
                      storage: { ...prev.storage, retentionDays: parseInt(e.target.value) }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Nettoyage automatique</h3>
                  <p className="text-sm text-gray-500">Supprime les anciennes données</p>
                </div>
                <Switch 
                  checked={config.storage.autoCleanup}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      storage: { ...prev.storage, autoCleanup: checked }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Mode Ne pas déranger</h3>
                  <p className="text-sm text-gray-500">Heures silencieuses</p>
                </div>
                <Switch 
                  checked={config.notifications.quietHours.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        quietHours: { ...prev.notifications.quietHours, enabled: checked }
                      }
                    }))
                  }
                />
              </div>

              {config.notifications.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Début</h3>
                    <input
                      type="time"
                      className="w-full p-2 border rounded"
                      value={config.notifications.quietHours.start}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            quietHours: { ...prev.notifications.quietHours, start: e.target.value }
                          }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Fin</h3>
                    <input
                      type="time"
                      className="w-full p-2 border rounded"
                      value={config.notifications.quietHours.end}
                      onChange={(e) => 
                        setConfig(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            quietHours: { ...prev.notifications.quietHours, end: e.target.value }
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedConfig;
