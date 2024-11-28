import React from 'react';
import { Card, List, Button, Popconfirm, Tag, Tooltip, Empty, Skeleton } from 'antd';
import {
    DesktopOutlined,
    MobileOutlined,
    TabletOutlined,
    GlobalOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Device {
    id: string;
    browser: string;
    os: string;
    device: string;
    ip: string;
    location: string;
    lastUsed: string;
    trusted: boolean;
}

const TrustedDevices: React.FC = () => {
    const [loading, setLoading] = React.useState(false);
    const [devices, setDevices] = React.useState<Device[]>([]);

    React.useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            // Appel API pour récupérer les appareils
            const response = await fetch('/api/security/trusted-devices');
            const data = await response.json();
            setDevices(data);
        } catch (error) {
            console.error('Erreur lors de la récupération des appareils', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (deviceId: string) => {
        try {
            await fetch(`/api/security/trusted-devices/${deviceId}`, {
                method: 'DELETE'
            });
            fetchDevices();
        } catch (error) {
            console.error('Erreur lors de la révocation de l\'appareil', error);
        }
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType.toLowerCase()) {
            case 'mobile':
                return <MobileOutlined className="text-xl" />;
            case 'tablet':
                return <TabletOutlined className="text-xl" />;
            default:
                return <DesktopOutlined className="text-xl" />;
        }
    };

    const renderDeviceInfo = (device: Device) => (
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                {getDeviceIcon(device.device)}
                <span className="font-medium">{device.browser}</span>
                <Tag color="blue">{device.os}</Tag>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-2">
                <GlobalOutlined />
                <span>{device.location}</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-2">
                <ClockCircleOutlined />
                <span>Dernière utilisation : {dayjs(device.lastUsed).fromNow()}</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <Card title="Appareils de confiance">
                <Skeleton active />
            </Card>
        );
    }

    return (
        <Card
            title="Appareils de confiance"
            extra={
                <Tooltip title="Ces appareils sont considérés comme sûrs">
                    <Button type="link" icon={<CheckCircleOutlined />}>
                        Gérer les appareils
                    </Button>
                </Tooltip>
            }
        >
            {devices.length === 0 ? (
                <Empty
                    description="Aucun appareil de confiance enregistré"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <List
                    dataSource={devices}
                    renderItem={device => (
                        <List.Item
                            key={device.id}
                            actions={[
                                device.trusted && (
                                    <Popconfirm
                                        title="Révoquer cet appareil ?"
                                        description="L'appareil devra être vérifié à nouveau lors de la prochaine connexion"
                                        onConfirm={() => handleRevoke(device.id)}
                                        okText="Révoquer"
                                        cancelText="Annuler"
                                    >
                                        <Button
                                            type="text"
                                            danger
                                            icon={<WarningOutlined />}
                                        >
                                            Révoquer
                                        </Button>
                                    </Popconfirm>
                                )
                            ]}
                        >
                            <List.Item.Meta
                                description={renderDeviceInfo(device)}
                            />
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );
};

export default TrustedDevices;
