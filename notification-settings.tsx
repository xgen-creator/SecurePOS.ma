import React, { useState } from 'react';
import { Bell, Clock, Calendar, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    soundEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    },
    notifications: {
      doorbell: true,
      motion: true,
      delivery: true
    }
  });

  const updateSetting = (path, value) => {
    setSettings(prev => ({
      ...prev,
      [path]: value
    }));
  };

  return (
    <div className="p-6 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Paramètres des Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Notifications Push</h3>
                  <p className="text-sm text-gray-500">Recevoir des alertes sur votre appareil</p>
                </div>
              </div>
              <Switch 
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Sons</h3>
                  <p className="text-sm text-gray-500">Sons de notification</p>
                </div>
              </div>
              <Switch 
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Mode Ne pas déranger</h3>
                  <p className="text-sm text-gray-500">
                    {settings.quietHours.enabled 
                      ? `Actif de ${settings.quietHours.start} à ${settings.quietHours.end}`
                      : 'Désactivé'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => updateSetting('quietHours.enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Types de Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Sonnette</span>
              <Switch 
                checked={settings.notifications.doorbell}
                onCheckedChange={(checked) => 
                  updateSetting('notifications.doorbell', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Détection de mouvement</span>
              <Switch 
                checked={settings.notifications.motion}
                onCheckedChange={(checked) => 
                  updateSetting('notifications.motion', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Livraisons</span>
              <Switch 
                checked={settings.notifications.delivery}
                onCheckedChange={(checked) => 
                  updateSetting('notifications.delivery', checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
