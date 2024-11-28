import React from 'react';
import { Form, Input, Button, Card, message, Space } from 'antd';
import { KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const TwoFactorVerification: React.FC = () => {
    const { verify2FA, resendCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = React.useState(false);
    const [resendLoading, setResendLoading] = React.useState(false);
    const [countdown, setCountdown] = React.useState(0);

    const userId = location.state?.userId;

    React.useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const onFinish = async (values: { code: string }) => {
        try {
            setLoading(true);
            await verify2FA(userId, values.code);
            message.success('Vérification réussie');
            navigate('/dashboard');
        } catch (error) {
            message.error('Code invalide. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            setResendLoading(true);
            await resendCode(userId);
            message.success('Nouveau code envoyé');
            setCountdown(60); // Délai de 60 secondes avant de pouvoir renvoyer
        } catch (error) {
            message.error('Erreur lors de l\'envoi du code');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-xl rounded-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SafetyCertificateOutlined className="text-3xl text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Vérification en deux étapes
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Entrez le code à 6 chiffres envoyé à votre appareil
                    </p>
                </div>

                <Form
                    name="2fa-verification"
                    onFinish={onFinish}
                    layout="vertical"
                    requiredMark={false}
                >
                    <Form.Item
                        name="code"
                        rules={[
                            { required: true, message: 'Code requis' },
                            { len: 6, message: 'Le code doit contenir 6 chiffres' },
                            { pattern: /^[0-9]+$/, message: 'Le code doit contenir uniquement des chiffres' }
                        ]}
                    >
                        <Input
                            prefix={<KeyOutlined />}
                            placeholder="000000"
                            size="large"
                            className="rounded-lg text-center tracking-widest"
                            maxLength={6}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space direction="vertical" className="w-full">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="w-full h-12 text-lg rounded-lg bg-blue-600 hover:bg-blue-700"
                            >
                                Vérifier
                            </Button>
                            
                            <Button
                                type="link"
                                onClick={handleResendCode}
                                disabled={countdown > 0}
                                loading={resendLoading}
                                className="w-full"
                            >
                                {countdown > 0 
                                    ? `Renvoyer le code (${countdown}s)`
                                    : 'Renvoyer le code'
                                }
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>

                <div className="mt-4 text-center">
                    <Button 
                        type="link" 
                        onClick={() => navigate('/backup-code')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        Utiliser un code de secours
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default TwoFactorVerification;
