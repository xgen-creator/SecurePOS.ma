import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Radio, Space, Typography, Modal } from 'antd';
import { LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TwoFactorAuthProps {
    userId: string;
    backupCodes?: string[];
    onVerify: (code: string, type: '2fa' | 'backup') => Promise<void>;
    onMethodChange?: (method: 'email' | 'sms') => Promise<void>;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
    userId,
    backupCodes,
    onVerify,
    onMethodChange
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBackupCode, setShowBackupCode] = useState(false);
    const [showBackupCodes, setShowBackupCodes] = useState(false);

    const handleSubmit = async (values: { code: string }) => {
        setLoading(true);
        setError(null);
        try {
            await onVerify(values.code, showBackupCode ? 'backup' : '2fa');
        } catch (err) {
            setError(err.message || 'Erreur de vérification');
        } finally {
            setLoading(false);
        }
    };

    const handleMethodChange = async (method: 'email' | 'sms') => {
        if (onMethodChange) {
            setLoading(true);
            setError(null);
            try {
                await onMethodChange(method);
            } catch (err) {
                setError(err.message || 'Erreur de changement de méthode');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <Title level={3} className="text-center mb-6">
                Vérification en deux étapes
            </Title>

            {error && (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    className="mb-4"
                />
            )}

            <Form
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
                requiredMark={false}
            >
                {!showBackupCode ? (
                    <>
                        <Form.Item
                            name="code"
                            rules={[
                                {
                                    required: true,
                                    message: 'Veuillez entrer le code de vérification'
                                },
                                {
                                    pattern: /^\d{6}$/,
                                    message: 'Le code doit contenir 6 chiffres'
                                }
                            ]}
                        >
                            <Input
                                prefix={<LockOutlined />}
                                placeholder="Code de vérification"
                                size="large"
                                maxLength={6}
                            />
                        </Form.Item>

                        {onMethodChange && (
                            <Form.Item label="Méthode de vérification">
                                <Radio.Group
                                    onChange={(e) => handleMethodChange(e.target.value)}
                                    className="w-full"
                                >
                                    <Space direction="vertical" className="w-full">
                                        <Radio value="email">
                                            <Space>
                                                <MailOutlined />
                                                <Text>Email</Text>
                                            </Space>
                                        </Radio>
                                        <Radio value="sms">
                                            <Space>
                                                <PhoneOutlined />
                                                <Text>SMS</Text>
                                            </Space>
                                        </Radio>
                                    </Space>
                                </Radio.Group>
                            </Form.Item>
                        )}
                    </>
                ) : (
                    <Form.Item
                        name="code"
                        rules={[
                            {
                                required: true,
                                message: 'Veuillez entrer le code de secours'
                            },
                            {
                                pattern: /^[0-9a-f]{8}$/,
                                message: 'Format de code de secours invalide'
                            }
                        ]}
                    >
                        <Input
                            prefix={<LockOutlined />}
                            placeholder="Code de secours"
                            size="large"
                        />
                    </Form.Item>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="w-full"
                    >
                        Vérifier
                    </Button>
                </Form.Item>

                <div className="text-center">
                    <Button
                        type="link"
                        onClick={() => setShowBackupCode(!showBackupCode)}
                    >
                        {showBackupCode
                            ? 'Utiliser le code de vérification'
                            : 'Utiliser un code de secours'}
                    </Button>
                </div>

                {backupCodes && (
                    <div className="text-center mt-4">
                        <Button
                            type="link"
                            onClick={() => setShowBackupCodes(true)}
                        >
                            Voir les codes de secours
                        </Button>
                    </div>
                )}
            </Form>

            <Modal
                title="Codes de secours"
                open={showBackupCodes}
                onOk={() => setShowBackupCodes(false)}
                onCancel={() => setShowBackupCodes(false)}
                footer={[
                    <Button key="close" onClick={() => setShowBackupCodes(false)}>
                        Fermer
                    </Button>
                ]}
            >
                <Alert
                    message="Important"
                    description="Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois."
                    type="warning"
                    showIcon
                    className="mb-4"
                />
                <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                        <Text key={code} copyable className="font-mono">
                            {code}
                        </Text>
                    ))}
                </div>
            </Modal>
        </div>
    );
};
