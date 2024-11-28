import React, { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { TwoFactorAuth } from './TwoFactorAuth';

export const LoginForm: React.FC = () => {
    const [form] = Form.useForm();
    const { login, verify2FA, setup2FA } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [twoFactorData, setTwoFactorData] = useState<{
        userId: string;
        backupCodes?: string[];
    } | null>(null);

    const handleSubmit = async (values: { email: string; password: string }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await login(values.email, values.password);
            if (response.status === 'pending_2fa') {
                setTwoFactorData({
                    userId: response.userId!,
                    backupCodes: response.backupCodes
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (code: string, type: '2fa' | 'backup') => {
        if (!twoFactorData) return;
        try {
            await verify2FA(twoFactorData.userId, code, type);
        } catch (err) {
            throw err;
        }
    };

    const handleMethodChange = async (method: 'email' | 'sms') => {
        if (!twoFactorData) return;
        try {
            await setup2FA(twoFactorData.userId, method);
        } catch (err) {
            throw err;
        }
    };

    if (twoFactorData) {
        return (
            <TwoFactorAuth
                userId={twoFactorData.userId}
                backupCodes={twoFactorData.backupCodes}
                onVerify={handleVerify}
                onMethodChange={handleMethodChange}
            />
        );
    }

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center mb-6">
                Connexion
            </h2>

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
                <Form.Item
                    name="email"
                    rules={[
                        {
                            required: true,
                            message: 'Veuillez entrer votre email'
                        },
                        {
                            type: 'email',
                            message: 'Email invalide'
                        }
                    ]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="Email"
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[
                        {
                            required: true,
                            message: 'Veuillez entrer votre mot de passe'
                        }
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Mot de passe"
                        size="large"
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="w-full"
                    >
                        Se connecter
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};
