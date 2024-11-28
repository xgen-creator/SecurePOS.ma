import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values: { email: string; password: string }) => {
        try {
            setLoading(true);
            const response = await login(values.email, values.password);
            
            if (response.status === 'pending_2fa') {
                navigate('/verify-2fa', { 
                    state: { userId: response.userId }
                });
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            message.error('Échec de la connexion. Vérifiez vos identifiants.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-xl rounded-2xl">
                <div className="text-center mb-8">
                    <img 
                        src="/logo.png" 
                        alt="Scanbell" 
                        className="h-12 mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-gray-800">
                        Connexion à Scanbell
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Sécurisez vos accès avec l'authentification à deux facteurs
                    </p>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    requiredMark={false}
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Email requis' },
                            { type: 'email', message: 'Email invalide' }
                        ]}
                    >
                        <Input 
                            prefix={<UserOutlined />}
                            placeholder="Email"
                            size="large"
                            className="rounded-lg"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Mot de passe requis' },
                            { min: 8, message: 'Minimum 8 caractères' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Mot de passe"
                            size="large"
                            className="rounded-lg"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="w-full h-12 text-lg rounded-lg bg-blue-600 hover:bg-blue-700"
                        >
                            Se connecter
                        </Button>
                    </Form.Item>

                    <div className="text-center">
                        <a href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                            Mot de passe oublié ?
                        </a>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default LoginForm;
