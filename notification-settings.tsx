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
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive alerts on your device</p>
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
                  <h3 className="font-medium">Sound Notifications</h3>
                  <p className="text-sm text-gray-500">Play sound for important alerts</p>
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
                  <h3 className="font-medium">Quiet Hours</h3>
                  <p className="text-sm text-gray-500">Mute notifications during specific hours</p>
                </div>
              </div>
              <Switch 
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => updateSetting('quietHours.enabled', checked)}
              />
            </div>

            {settings.quietHours.enabled && (
              <div className="ml-8 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => updateSetting('quietHours.start', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">End Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => updateSetting('quietHours.end', e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Doorbell</label>
              <Switch 
                checked={settings.notifications.doorbell}
                onCheckedChange={(checked) => updateSetting('notifications.doorbell', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Motion Detection</label>
              <Switch 
                checked={settings.notifications.motion}
                onCheckedChange={(checked) => updateSetting('notifications.motion', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Deliveries</label>
              <Switch 
                checked={settings.notifications.delivery}
                onCheckedChange={(checked) => updateSetting('notifications.delivery', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
