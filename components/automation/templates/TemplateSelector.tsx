import React from 'react';
import { AUTOMATION_TEMPLATES } from './AutomationTemplates';
import type { Device } from '../../devices/types';
import type { AutomationRule } from '../types';

interface TemplateSelectorProps {
  devices: Device[];
  onSelect: (rule: AutomationRule) => void;
  onClose: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  devices,
  onSelect,
  onClose
}) => {
  const handleTemplateSelect = (template: AutomationRule) => {
    // Trouver les appareils compatibles pour chaque action
    const compatibleDevices = template.actions.reduce((acc, action) => {
      if (action.type === 'device_control') {
        const command = action.config.command;
        let compatibleTypes: string[] = [];

        switch (command) {
          case 'lock':
          case 'unlock':
            compatibleTypes = ['lock'];
            break;
          case 'turn_on':
          case 'turn_off':
          case 'set_brightness':
          case 'set_color':
            compatibleTypes = ['light'];
            break;
          case 'start_recording':
          case 'stop_recording':
          case 'take_snapshot':
            compatibleTypes = ['camera'];
            break;
        }

        acc[action.config.deviceId] = devices.filter(d => 
          compatibleTypes.includes(d.type)
        );
      }
      return acc;
    }, {} as { [key: string]: Device[] });

    // Créer une copie du template avec les appareils par défaut
    const configuredTemplate = {
      ...template,
      actions: template.actions.map(action => {
        if (action.type === 'device_control') {
          const compatibleDevicesList = compatibleDevices[action.config.deviceId];
          if (compatibleDevicesList?.length > 0) {
            return {
              ...action,
              config: {
                ...action.config,
                deviceId: compatibleDevicesList[0].id
              }
            };
          }
        }
        return action;
      })
    };

    onSelect(configuredTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Modèles d'automatisation
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez un modèle pour créer rapidement une règle d'automatisation
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4">
            {AUTOMATION_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="
                  text-left p-4 rounded-xl border hover:border-blue-500
                  hover:bg-blue-50 transition-colors
                "
              >
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
