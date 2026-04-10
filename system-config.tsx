import React, { useState } from 'react';
import { Settings, Wifi, Battery, Camera, Volume, Bell, Lock, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const SystemConfig = () => {
  const [config, setConfig] = useState({
    wifi: {
      enabled: true,
      ssid: 'Home-Network',
      strength: 85
    },
    battery: {
      level: 75,
      charging: true
    },
    camera: {
      resolution: 'HD',
      nightMode: true,
      motionDetection: true
    },
    audio: {
      volume: 80,
      micSensitivity: 65,
      noiseReduction: true
    },
    security: {
      autoLock: true,
      pinRequired: true,
      twoFactorAuth: false
    }
  });

  return (
    <div className="p-6">
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Connectivité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Wi-Fi</h3>
                  <p className="text-sm text-gray-500">{config.wifi.ssid}</p>
                </div>
                <Switch checked={config.wifi.enabled} />
              </div>
              
              <div>
                <h4 className="text-sm text-gray-500 mb-2">Force du signal</h4>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{width: `${config.wifi.strength}%`}}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Caméra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Vision nocturne</h3>
                  <p className="text-sm text-gray-500">Activation automatique</p>
                </div>
                <Switch checked={config.camera.nightMode} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Détection de mouvement</h3>
                  <p className="text-sm text-gray-500">Notifications automatiques</p>
                </div>
                <Switch checked={config.camera.motionDetection} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume className="w-5 h-5" />
              Audio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Volume sonnette</span>
                  <span className="text-sm text-gray-500">{config.audio.volume}%</span>
                </div>
                <Slider
                  value={[config.audio.volume]}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Sensibilité micro</span>
                  <span className="text-sm text-gray-500">{config.audio.micSensitivity}%</span>
                </div>
                <Slider
                  value={[config.audio.micSensitivity]}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Verrouillage auto</h3>
                  <p className="text-sm text-gray-500">Après 5 minutes d'inactivité</p>
                </div>
                <Switch checked={config.security.autoLock} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemConfig;