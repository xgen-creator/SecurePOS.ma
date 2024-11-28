import React, { useEffect, useState } from 'react';
import { Switch, TimePicker, Alert } from 'antd';
import { Bell, Moon, Package, Message, Phone } from 'lucide-react';
import { useNotificationService } from '../hooks/useNotificationService';

interface NotificationPreferences {
    doNotDisturb: boolean;
    doNotDisturbStart: string;
    doNotDisturbEnd: string;
    notificationTypes: {
        visits: boolean;
        deliveries: boolean;
        messages: boolean;
        calls: boolean;
    };
}

const NotificationSettings: React.FC = () => {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        doNotDisturb: false,
        doNotDisturbStart: '22:00',
        doNotDisturbEnd: '07:00',
        notificationTypes: {
            visits: true,
            deliveries: true,
            messages: true,
            calls: true
        }
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const notificationService = useNotificationService();

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const userPrefs = await notificationService.getUserPreferences();
            setPreferences(userPrefs);
            setLoading(false);
        } catch (error) {
            setError('Erreur lors du chargement des préférences');
            setLoading(false);
        }
    };

    const handlePreferenceChange = async (changes: Partial<NotificationPreferences>) => {
        try {
            const newPreferences = { ...preferences, ...changes };
            setPreferences(newPreferences);
            await notificationService.updatePreferences(newPreferences);
        } catch (error) {
            setError('Erreur lors de la mise à jour des préférences');
        }
    };

    const handleNotificationTypeChange = (type: keyof typeof preferences.notificationTypes) => {
        handlePreferenceChange({
            notificationTypes: {
                ...preferences.notificationTypes,
                [type]: !preferences.notificationTypes[type]
            }
        });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Chargement...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            {error && (
                <Alert
                    message="Erreur"
                    description={error}
                    type="error"
                    closable
                    className="mb-6"
                    onClose={() => setError(null)}
                />
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">Paramètres de notifications</h2>

                {/* Mode Ne pas déranger */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <Moon className="w-5 h-5 mr-2 text-gray-600" />
                            <span className="font-medium">Mode Ne pas déranger</span>
                        </div>
                        <Switch
                            checked={preferences.doNotDisturb}
                            onChange={(checked) => handlePreferenceChange({ doNotDisturb: checked })}
                        />
                    </div>

                    {preferences.doNotDisturb && (
                        <div className="flex items-center space-x-4 ml-7">
                            <TimePicker
                                format="HH:mm"
                                value={preferences.doNotDisturbStart}
                                onChange={(time) => handlePreferenceChange({
                                    doNotDisturbStart: time?.format('HH:mm') || '22:00'
                                })}
                                className="w-32"
                            />
                            <span>à</span>
                            <TimePicker
                                format="HH:mm"
                                value={preferences.doNotDisturbEnd}
                                onChange={(time) => handlePreferenceChange({
                                    doNotDisturbEnd: time?.format('HH:mm') || '07:00'
                                })}
                                className="w-32"
                            />
                        </div>
                    )}
                </div>

                {/* Types de notifications */}
                <div>
                    <h3 className="font-medium mb-4">Types de notifications</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Bell className="w-5 h-5 mr-2 text-gray-600" />
                                <span>Visites</span>
                            </div>
                            <Switch
                                checked={preferences.notificationTypes.visits}
                                onChange={() => handleNotificationTypeChange('visits')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Package className="w-5 h-5 mr-2 text-gray-600" />
                                <span>Livraisons</span>
                            </div>
                            <Switch
                                checked={preferences.notificationTypes.deliveries}
                                onChange={() => handleNotificationTypeChange('deliveries')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Message className="w-5 h-5 mr-2 text-gray-600" />
                                <span>Messages</span>
                            </div>
                            <Switch
                                checked={preferences.notificationTypes.messages}
                                onChange={() => handleNotificationTypeChange('messages')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Phone className="w-5 h-5 mr-2 text-gray-600" />
                                <span>Appels</span>
                            </div>
                            <Switch
                                checked={preferences.notificationTypes.calls}
                                onChange={() => handleNotificationTypeChange('calls')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
