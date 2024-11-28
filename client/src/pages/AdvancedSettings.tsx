import React from 'react';
import { Card, Form, Switch, InputNumber, Select, Button, Collapse, Alert, Space, Typography } from 'antd';
import {
    LockOutlined,
    BellOutlined,
    GlobalOutlined,
    SecurityScanOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Title, Text } = Typography;

const AdvancedSettings: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Sauvegarder les paramètres
            console.log(values);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Alert
                message="Paramètres avancés"
                description="Ces paramètres peuvent affecter la sécurité de votre compte. Modifiez-les avec précaution."
                type="warning"
                showIcon
                className="mb-6"
            />

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    sessionTimeout: 30,
                    maxAttempts: 5,
                    codeLength: 6,
                    codeExpiration: 10,
                    notificationDelay: 0,
                    language: 'fr'
                }}
            >
                <Space direction="vertical" className="w-full" size="large">
                    <Card>
                        <Title level={4}>
                            <LockOutlined className="mr-2" />
                            Paramètres de session
                        </Title>
                        <Form.Item
                            name="sessionTimeout"
                            label="Délai d'expiration de session (minutes)"
                            tooltip="La session sera automatiquement fermée après cette période d'inactivité"
                        >
                            <InputNumber min={5} max={120} className="w-full" />
                        </Form.Item>

                        <Form.Item
                            name="rememberDevice"
                            valuePropName="checked"
                            label="Mémoriser les appareils de confiance"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name="deviceTrustDuration"
                            label="Durée de confiance des appareils (jours)"
                            tooltip="Période pendant laquelle un appareil de confiance ne nécessite pas de 2FA"
                        >
                            <InputNumber min={1} max={30} className="w-full" />
                        </Form.Item>
                    </Card>

                    <Card>
                        <Title level={4}>
                            <SecurityScanOutlined className="mr-2" />
                            Paramètres de sécurité
                        </Title>
                        <Form.Item
                            name="maxAttempts"
                            label="Tentatives maximales"
                            tooltip="Nombre maximal de tentatives de connexion avant le blocage"
                        >
                            <InputNumber min={3} max={10} className="w-full" />
                        </Form.Item>

                        <Form.Item
                            name="codeLength"
                            label="Longueur du code 2FA"
                        >
                            <Select>
                                <Select.Option value={6}>6 chiffres</Select.Option>
                                <Select.Option value={8}>8 chiffres</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="codeExpiration"
                            label="Expiration du code (minutes)"
                        >
                            <InputNumber min={1} max={30} className="w-full" />
                        </Form.Item>
                    </Card>

                    <Card>
                        <Title level={4}>
                            <BellOutlined className="mr-2" />
                            Paramètres de notification
                        </Title>
                        <Form.Item
                            name="loginNotifications"
                            valuePropName="checked"
                            label="Notifications de connexion"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name="securityAlerts"
                            valuePropName="checked"
                            label="Alertes de sécurité"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name="notificationDelay"
                            label="Délai de notification (secondes)"
                            tooltip="Délai avant l'envoi des notifications non critiques"
                        >
                            <InputNumber min={0} max={300} className="w-full" />
                        </Form.Item>
                    </Card>

                    <Card>
                        <Title level={4}>
                            <GlobalOutlined className="mr-2" />
                            Paramètres régionaux
                        </Title>
                        <Form.Item
                            name="language"
                            label="Langue"
                        >
                            <Select>
                                <Select.Option value="fr">Français</Select.Option>
                                <Select.Option value="en">English</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="timezone"
                            label="Fuseau horaire"
                        >
                            <Select showSearch>
                                <Select.Option value="Europe/Paris">Europe/Paris</Select.Option>
                                <Select.Option value="UTC">UTC</Select.Option>
                            </Select>
                        </Form.Item>
                    </Card>

                    <Collapse>
                        <Panel header="Options avancées" key="advanced">
                            <Space direction="vertical" className="w-full">
                                <Form.Item
                                    name="debugMode"
                                    valuePropName="checked"
                                    label="Mode debug"
                                >
                                    <Switch />
                                </Form.Item>

                                <Form.Item
                                    name="strictMode"
                                    valuePropName="checked"
                                    label="Mode strict"
                                    tooltip="Active des vérifications de sécurité supplémentaires"
                                >
                                    <Switch />
                                </Form.Item>

                                <Alert
                                    message="Attention"
                                    description="Ces options peuvent affecter les performances du système"
                                    type="warning"
                                    showIcon
                                />
                            </Space>
                        </Panel>
                    </Collapse>

                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Enregistrer les modifications
                            </Button>
                            <Button onClick={() => form.resetFields()}>
                                Réinitialiser
                            </Button>
                        </Space>
                    </Form.Item>
                </Space>
            </Form>
        </div>
    );
};

export default AdvancedSettings;
