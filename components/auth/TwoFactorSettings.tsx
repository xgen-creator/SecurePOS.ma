import React, { useState, useEffect } from 'react';
import { Card, Switch, Radio, Button, Space, Alert, Modal, Typography, message } from 'antd';
import { SecurityScanOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Text, Title } = Typography;

interface TwoFactorSettingsProps {
    userId: string;
    is2FAEnabled?: boolean;
    current2FAMethod?: 'email' | 'sms' | null;
    onUpdate?: () => void;
}

export const TwoFactorSettings: React.FC<TwoFactorSettingsProps> = ({
    userId,
    is2FAEnabled = false,
    current2FAMethod = null,
    onUpdate
}) => {
    const { setup2FA, disable2FA } = useAuth();
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState(is2FAEnabled);
    const [method, setMethod] = useState<'email' | 'sms'>(current2FAMethod || 'email');
    const [showConfirmDisable, setShowConfirmDisable] = useState(false);

    useEffect(() => {
        setEnabled(is2FAEnabled);
        if (current2FAMethod) {
            setMethod(current2FAMethod);
        }
    }, [is2FAEnabled, current2FAMethod]);

    const handleToggle = async (checked: boolean) => {
        if (!checked) {
            setShowConfirmDisable(true);
            return;
        }

        setLoading(true);
        try {
            await setup2FA(userId, method);
            setEnabled(true);
            message.success('Authentification à deux facteurs activée');
            onUpdate?.();
        } catch (err) {
            message.error('Erreur lors de l\'activation de l\'authentification à deux facteurs');
        } finally {
            setLoading(false);
        }
    };

    const handleMethodChange = async (newMethod: 'email' | 'sms') => {
        if (!enabled) {
            setMethod(newMethod);
            return;
        }

        setLoading(true);
        try {
            await setup2FA(userId, newMethod);
            setMethod(newMethod);
            message.success('Méthode de vérification mise à jour');
            onUpdate?.();
        } catch (err) {
            message.error('Erreur lors du changement de méthode');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        try {
            await disable2FA(userId);
            setEnabled(false);
            setShowConfirmDisable(false);
            message.success('Authentification à deux facteurs désactivée');
            onUpdate?.();
        } catch (err) {
            message.error('Erreur lors de la désactivation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <Space>
                    <SecurityScanOutlined className="text-2xl text-blue-500" />
                    <Title level={4} className="!mb-0">
                        Authentification à deux facteurs
                    </Title>
                </Space>
                <Switch
                    checked={enabled}
                    onChange={handleToggle}
                    loading={loading}
                />
            </div>

            <Alert
                message="Protection supplémentaire"
                description="L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte. À chaque connexion, vous devrez fournir un code de vérification en plus de votre mot de passe."
                type="info"
                showIcon
                className="mb-6"
            />

            <div className="mb-6">
                <Text strong className="mb-2 block">
                    Méthode de vérification
                </Text>
                <Radio.Group
                    value={method}
                    onChange={(e) => handleMethodChange(e.target.value)}
                    disabled={loading}
                >
                    <Space direction="vertical" className="w-full">
                        <Radio value="email">
                            <Space>
                                <MailOutlined />
                                <span>Email</span>
                            </Space>
                        </Radio>
                        <Radio value="sms">
                            <Space>
                                <PhoneOutlined />
                                <span>SMS</span>
                            </Space>
                        </Radio>
                    </Space>
                </Radio.Group>
            </div>

            <Modal
                title="Désactiver l'authentification à deux facteurs"
                open={showConfirmDisable}
                onOk={handleDisable}
                onCancel={() => setShowConfirmDisable(false)}
                okText="Désactiver"
                cancelText="Annuler"
                confirmLoading={loading}
            >
                <Alert
                    message="Attention"
                    description="La désactivation de l'authentification à deux facteurs réduira la sécurité de votre compte. Êtes-vous sûr de vouloir continuer ?"
                    type="warning"
                    showIcon
                    className="mb-4"
                />
            </Modal>
        </Card>
    );
};
