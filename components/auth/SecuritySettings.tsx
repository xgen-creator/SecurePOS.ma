import React, { useState, useEffect } from 'react';
import { Typography, Space, Divider } from 'antd';
import axios from 'axios';
import { TwoFactorSettings } from './TwoFactorSettings';
import { BackupCodes } from './BackupCodes';

const { Title } = Typography;

interface SecuritySettingsProps {
    userId: string;
}

interface SecurityState {
    is2FAEnabled: boolean;
    current2FAMethod: 'email' | 'sms' | null;
    backupCodes: string[];
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [securityState, setSecurityState] = useState<SecurityState>({
        is2FAEnabled: false,
        current2FAMethod: null,
        backupCodes: []
    });

    const fetchSecuritySettings = async () => {
        try {
            const response = await axios.get(`/auth/security-settings/${userId}`);
            setSecurityState(response.data);
        } catch (err) {
            console.error('Erreur lors du chargement des paramètres de sécurité:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecuritySettings();
    }, [userId]);

    const handleUpdate = () => {
        fetchSecuritySettings();
    };

    const handleBackupCodesRegenerate = (newCodes: string[]) => {
        setSecurityState(prev => ({
            ...prev,
            backupCodes: newCodes
        }));
    };

    if (loading) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Space direction="vertical" className="w-full" size="large">
                <Title level={2}>Paramètres de sécurité</Title>

                <TwoFactorSettings
                    userId={userId}
                    is2FAEnabled={securityState.is2FAEnabled}
                    current2FAMethod={securityState.current2FAMethod}
                    onUpdate={handleUpdate}
                />

                {securityState.is2FAEnabled && (
                    <>
                        <Divider />
                        <BackupCodes
                            userId={userId}
                            codes={securityState.backupCodes}
                            onRegenerate={handleBackupCodesRegenerate}
                        />
                    </>
                )}
            </Space>
        </div>
    );
};
