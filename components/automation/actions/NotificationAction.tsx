import React from 'react';
import { AlertCircle, Smartphone, Bell, Mail } from 'lucide-react';

interface NotificationActionProps {
  action: {
    type: 'notification';
    message?: string;
    channels: string[];
    priority?: 'low' | 'normal' | 'high';
  };
  onChange: (updatedAction: any) => void;
}

const NotificationAction: React.FC<NotificationActionProps> = ({
  action,
  onChange
}) => {
  const notificationChannels = [
    { id: 'push', label: 'Notification push', icon: Smartphone },
    { id: 'sound', label: 'Sonnerie', icon: Bell },
    { id: 'email', label: 'Email', icon: Mail }
  ];

  const priorityLevels = [
    { id: 'low', label: 'Basse', color: 'bg-gray-100 text-gray-600' },
    { id: 'normal', label: 'Normale', color: 'bg-blue-100 text-blue-600' },
    { id: 'high', label: 'Haute', color: 'bg-red-100 text-red-600' }
  ];

  const toggleChannel = (channelId: string) => {
    const currentChannels = action.channels || [];
    const updatedChannels = currentChannels.includes(channelId)
      ? currentChannels.filter(c => c !== channelId)
      : [...currentChannels, channelId];

    onChange({
      ...action,
      channels: updatedChannels
    });
  };

  const handleMessageChange = (message: string) => {
    onChange({
      ...action,
      message
    });
  };

  const handlePriorityChange = (priority: 'low' | 'normal' | 'high') => {
    onChange({
      ...action,
      priority
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Notification</span>
      </div>

      {/* Message de notification */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Message
        </label>
        <textarea
          value={action.message || ''}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Entrez votre message..."
          className="w-full p-2 border rounded-lg resize-none"
          rows={3}
        />
      </div>

      {/* Canaux de notification */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Canaux de notification
        </label>
        <div className="space-y-2">
          {notificationChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg border transition-colors
                ${action.channels?.includes(channel.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <channel.icon className="w-4 h-4" />
              <span>{channel.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Priorité */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Priorité
        </label>
        <div className="flex gap-2">
          {priorityLevels.map(priority => (
            <button
              key={priority.id}
              onClick={() => handlePriorityChange(priority.id as any)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium
                ${action.priority === priority.id ? priority.color : 'bg-gray-100 text-gray-600'}
              `}
            >
              {priority.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationAction;
