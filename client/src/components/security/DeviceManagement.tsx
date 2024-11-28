import React, { useEffect, useState } from 'react';
import {
    Card,
    Table,
    Button,
    Tag,
    Popconfirm,
    message,
    Typography,
    Space,
    Modal,
    Tooltip
} from 'antd';
import {
    DeleteOutlined,
    LaptopOutlined,
    MobileOutlined,
    TabletOutlined,
    GlobalOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { Title, Text } = Typography;

interface Device {
    id: string;
    type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    name: string;
    browser: string;
    os: string;
    lastSeen: string;
    ipAddress: string;
    location: string;
    trusted: boolean;
    current: boolean;
}

const DeviceManagement: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/security/devices');
            if (!response.ok) throw new Error('Erreur lors du chargement des appareils');
            const data = await response.json();
            setDevices(data);
        } catch (error) {
            message.error('Impossible de charger la liste des appareils');
            console.error('Error loading devices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAccess = async (deviceId: string) => {
        try {
            const response = await fetch(`/api/security/devices/${deviceId}/revoke`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Erreur lors de la révocation');
            
            message.success('Accès révoqué avec succès');
            loadDevices();
        } catch (error) {
            message.error('Impossible de révoquer l\'accès');
            console.error('Error revoking device:', error);
        }
    };

    const handleTrustDevice = async (deviceId: string) => {
        try {
            const response = await fetch(`/api/security/devices/${deviceId}/trust`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Erreur lors de la mise à jour');
            
            message.success('Appareil marqué comme fiable');
            loadDevices();
        } catch (error) {
            message.error('Impossible de mettre à jour le statut de l\'appareil');
            console.error('Error trusting device:', error);
        }
    };

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'mobile':
                return <MobileOutlined />;
            case 'tablet':
                return <TabletOutlined />;
            case 'desktop':
                return <LaptopOutlined />;
            default:
                return <GlobalOutlined />;
        }
    };

    const columns = [
        {
            title: 'Appareil',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Device) => (
                <Space>
                    {getDeviceIcon(record.type)}
                    <span>{text}</span>
                    {record.current && (
                        <Tag color="green">Actuel</Tag>
                    )}
                </Space>
            )
        },
        {
            title: 'Navigateur',
            dataIndex: 'browser',
            key: 'browser'
        },
        {
            title: 'Système',
            dataIndex: 'os',
            key: 'os'
        },
        {
            title: 'Dernière activité',
            dataIndex: 'lastSeen',
            key: 'lastSeen',
            render: (date: string) => (
                formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
            )
        },
        {
            title: 'Statut',
            key: 'status',
            render: (record: Device) => (
                <Space>
                    {record.trusted ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                            Fiable
                        </Tag>
                    ) : (
                        <Tag icon={<ExclamationCircleOutlined />} color="warning">
                            Non vérifié
                        </Tag>
                    )}
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: Device) => (
                <Space>
                    <Button
                        type="link"
                        onClick={() => {
                            setSelectedDevice(record);
                            setDetailsVisible(true);
                        }}
                    >
                        Détails
                    </Button>
                    {!record.current && (
                        <>
                            {!record.trusted && (
                                <Button
                                    type="link"
                                    onClick={() => handleTrustDevice(record.id)}
                                >
                                    Faire confiance
                                </Button>
                            )}
                            <Popconfirm
                                title="Êtes-vous sûr de vouloir révoquer l'accès ?"
                                onConfirm={() => handleRevokeAccess(record.id)}
                                okText="Oui"
                                cancelText="Non"
                            >
                                <Button type="link" danger icon={<DeleteOutlined />}>
                                    Révoquer
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-4">
            <Card>
                <Title level={4}>Gestion des appareils</Title>
                <Text type="secondary" className="mb-4 block">
                    Gérez les appareils connectés à votre compte et leurs autorisations.
                </Text>

                <Table
                    dataSource={devices}
                    columns={columns}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title="Détails de l'appareil"
                open={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                footer={null}
                width={600}
            >
                {selectedDevice && (
                    <div className="space-y-4">
                        <div>
                            <Text type="secondary">Nom de l'appareil</Text>
                            <div>{selectedDevice.name}</div>
                        </div>
                        <div>
                            <Text type="secondary">Adresse IP</Text>
                            <div>{selectedDevice.ipAddress}</div>
                        </div>
                        <div>
                            <Text type="secondary">Localisation</Text>
                            <div>{selectedDevice.location}</div>
                        </div>
                        <div>
                            <Text type="secondary">Navigateur</Text>
                            <div>{selectedDevice.browser}</div>
                        </div>
                        <div>
                            <Text type="secondary">Système d'exploitation</Text>
                            <div>{selectedDevice.os}</div>
                        </div>
                        <div>
                            <Text type="secondary">Dernière activité</Text>
                            <div>
                                {formatDistanceToNow(new Date(selectedDevice.lastSeen), {
                                    addSuffix: true,
                                    locale: fr
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DeviceManagement;
