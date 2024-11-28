import React from 'react';
import { Card, Form, Input, Button, Upload, message, Tabs, List } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import type { UploadFile } from 'antd/es/upload/interface';

const { TabPane } = Tabs;

const UserProfile: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [avatar, setAvatar] = React.useState<UploadFile[]>([]);

    const deviceHistory = [
        { device: 'Windows PC', browser: 'Chrome', lastUsed: '2024-01-20 14:30', status: 'active' },
        { device: 'iPhone 12', browser: 'Safari', lastUsed: '2024-01-19 09:15', status: 'active' },
        { device: 'MacBook Pro', browser: 'Firefox', lastUsed: '2024-01-15 18:45', status: 'inactive' }
    ];

    const onFinish = async (values: any) => {
        try {
            setLoading(true);
            await updateProfile({
                ...values,
                avatar: avatar[0]?.url
            });
            message.success('Profil mis à jour avec succès');
        } catch (error) {
            message.error('Erreur lors de la mise à jour du profil');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = ({ fileList }: { fileList: UploadFile[] }) => {
        setAvatar(fileList);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center space-x-4 mb-8">
                    <Upload
                        listType="picture-circle"
                        fileList={avatar}
                        onChange={handleAvatarChange}
                        maxCount={1}
                    >
                        {avatar.length === 0 && <UploadOutlined />}
                    </Upload>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {user?.name || 'Utilisateur'}
                        </h1>
                        <p className="text-gray-600">
                            Membre depuis {new Date(user?.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <Tabs defaultActiveKey="info">
                    <TabPane tab="Informations personnelles" key="info">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            initialValues={user}
                        >
                            <Form.Item
                                name="name"
                                label="Nom complet"
                                rules={[{ required: true, message: 'Nom requis' }]}
                            >
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Email requis' },
                                    { type: 'email', message: 'Email invalide' }
                                ]}
                            >
                                <Input prefix={<MailOutlined />} />
                            </Form.Item>

                            <Form.Item
                                name="phone"
                                label="Téléphone"
                                rules={[{ pattern: /^[+\d\s-]+$/, message: 'Numéro invalide' }]}
                            >
                                <Input prefix={<PhoneOutlined />} />
                            </Form.Item>

                            <Form.Item>
                                <Button 
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Mettre à jour le profil
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>

                    <TabPane tab="Appareils connectés" key="devices">
                        <List
                            dataSource={deviceHistory}
                            renderItem={item => (
                                <List.Item
                                    actions={[
                                        <Button 
                                            type="text" 
                                            danger={item.status === 'active'}
                                        >
                                            {item.status === 'active' ? 'Déconnecter' : 'Supprimer'}
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={item.device}
                                        description={
                                            <>
                                                <div>{item.browser}</div>
                                                <div className="text-gray-500">
                                                    Dernière utilisation : {item.lastUsed}
                                                </div>
                                            </>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </TabPane>

                    <TabPane tab="Préférences de notification" key="notifications">
                        <Form layout="vertical">
                            <Form.Item
                                name="emailNotifications"
                                valuePropName="checked"
                                label="Notifications par email"
                            >
                                <List.Item
                                    actions={[<Button type="link">Configurer</Button>]}
                                >
                                    <List.Item.Meta
                                        title="Alertes de sécurité"
                                        description="Recevez des notifications pour les activités suspectes"
                                    />
                                </List.Item>
                            </Form.Item>

                            <Form.Item
                                name="smsNotifications"
                                valuePropName="checked"
                                label="Notifications SMS"
                            >
                                <List.Item
                                    actions={[<Button type="link">Configurer</Button>]}
                                >
                                    <List.Item.Meta
                                        title="Codes de vérification"
                                        description="Recevez les codes 2FA par SMS"
                                    />
                                </List.Item>
                            </Form.Item>
                        </Form>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default UserProfile;
