import type { AutomationRule } from '../types';

export const AUTOMATION_TEMPLATES: AutomationRule[] = [
  // Sécurité - Verrouillage automatique
  {
    id: 'template_security_autolock',
    name: 'Verrouillage automatique la nuit',
    description: 'Verrouille automatiquement la porte d\'entrée à une heure définie',
    enabled: false,
    conditions: [
      {
        type: 'time_range',
        config: {
          startTime: '23:00',
          endTime: '23:05',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      }
    ],
    actions: [
      {
        type: 'device_control',
        config: {
          deviceId: '', // À configurer
          command: 'lock'
        }
      }
    ]
  },

  // Éclairage - Mode soirée
  {
    id: 'template_evening_lights',
    name: 'Mode soirée',
    description: 'Active un éclairage tamisé en soirée quand une personne est présente',
    enabled: false,
    conditions: [
      {
        type: 'time_range',
        config: {
          startTime: '19:00',
          endTime: '23:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      },
      {
        type: 'person_presence',
        config: {
          personIds: [], // À configurer
          timeWindow: 300 // 5 minutes
        }
      }
    ],
    actions: [
      {
        type: 'device_control',
        config: {
          deviceId: '', // À configurer
          command: 'set_brightness',
          value: 40
        }
      }
    ]
  },

  // Sécurité - Surveillance
  {
    id: 'template_security_camera',
    name: 'Surveillance automatique',
    description: 'Démarre l\'enregistrement quand une personne inconnue est détectée',
    enabled: false,
    conditions: [
      {
        type: 'person_presence',
        config: {
          personIds: [], // Liste vide = personnes inconnues
          timeWindow: 60 // 1 minute
        }
      }
    ],
    actions: [
      {
        type: 'device_control',
        config: {
          deviceId: '', // À configurer
          command: 'start_recording'
        }
      },
      {
        type: 'notification',
        config: {
          title: 'Alerte sécurité',
          message: 'Personne inconnue détectée',
          type: 'warning'
        }
      }
    ]
  },

  // Confort - Température
  {
    id: 'template_temperature_control',
    name: 'Contrôle de température',
    description: 'Ajuste l\'éclairage en fonction de la température',
    enabled: false,
    conditions: [
      {
        type: 'device_state',
        config: {
          deviceId: '', // Capteur de température à configurer
          state: 'above',
          value: 25
        }
      }
    ],
    actions: [
      {
        type: 'device_control',
        config: {
          deviceId: '', // Lumière à configurer
          command: 'set_color',
          value: '#FF9500' // Orange pour ambiance chaude
        }
      }
    ]
  },

  // Accueil - Bienvenue
  {
    id: 'template_welcome_home',
    name: 'Bienvenue à la maison',
    description: 'Accueille les résidents avec un éclairage personnalisé',
    enabled: false,
    conditions: [
      {
        type: 'person_presence',
        config: {
          personIds: [], // À configurer avec les résidents
          timeWindow: 30 // 30 secondes
        }
      },
      {
        type: 'device_state',
        config: {
          deviceId: '', // À configurer avec la porte d'entrée
          state: 'unlocked'
        }
      }
    ],
    actions: [
      {
        type: 'device_control',
        config: {
          deviceId: '', // Lumière d'entrée à configurer
          command: 'turn_on'
        }
      },
      {
        type: 'notification',
        config: {
          title: 'Bienvenue',
          message: 'Bon retour à la maison !',
          type: 'info'
        }
      }
    ]
  }
];

export const getTemplateById = (id: string): AutomationRule | undefined => {
  return AUTOMATION_TEMPLATES.find(template => template.id === id);
};

export const createRuleFromTemplate = (
  templateId: string,
  config: {
    devices?: { [key: string]: string }; // Map of placeholder deviceId to actual deviceId
    persons?: string[]; // List of person IDs to use
  } = {}
): AutomationRule | undefined => {
  const template = getTemplateById(templateId);
  if (!template) return undefined;

  // Deep clone the template
  const rule: AutomationRule = JSON.parse(JSON.stringify(template));

  // Generate a new unique ID
  rule.id = `rule_${Math.random().toString(36).substring(2)}`;

  // Configure devices
  if (config.devices) {
    rule.actions = rule.actions.map(action => {
      if (action.type === 'device_control' && !action.config.deviceId) {
        return {
          ...action,
          config: {
            ...action.config,
            deviceId: config.devices[action.config.deviceId] || ''
          }
        };
      }
      return action;
    });

    rule.conditions = rule.conditions.map(condition => {
      if (condition.type === 'device_state' && !condition.config.deviceId) {
        return {
          ...condition,
          config: {
            ...condition.config,
            deviceId: config.devices[condition.config.deviceId] || ''
          }
        };
      }
      return condition;
    });
  }

  // Configure persons
  if (config.persons) {
    rule.conditions = rule.conditions.map(condition => {
      if (condition.type === 'person_presence') {
        return {
          ...condition,
          config: {
            ...condition.config,
            personIds: config.persons
          }
        };
      }
      return condition;
    });
  }

  return rule;
};
