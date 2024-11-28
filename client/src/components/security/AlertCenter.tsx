import React, { useEffect, useState } from 'react';
import {
    Card,
    List,
    Badge,
    Tag,
    Button,
    Typography,
    Space,
    Tabs,
    Empty,
    Spin,
    message,
    Modal,
    Alert
} from 'antd';
import {
    WarningOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    BellOutlined,
    SecurityScanOutlined,
    GlobalOutlined,
    UserOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SecurityAlert {
    id: string;
    type: 'warning' | 'critical' | 'info';
    title: string;
    description: string;
    timestamp: string;
    status: 'new' | 'in_progress' | 'resolved';
    metadata: {
        location?: string;
        deviceInfo?: {
            browser: string;
            os: string;
        };
        riskScore?: number;
        riskFactors?: string[];
        ipAddress?: string;
    };
    actions?: {
        type: string;
        label: string;
        endpoint: string;
    }[];
}

const AlertCenter: React.FC = () => {
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [actionInProgress, setActionInProgress] = useState(false);

    useEffect(() => {
        loadAlerts();
        // Rafraîchir les alertes toutes les 30 secondes
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            const response = await fetch('/api/security/alerts');
            if (!response.ok) throw new Error('Erreur lors du chargement des alertes');
            const data = await response.json();
            setAlerts(data);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAlertAction = async (alertId: string, action: { type: string, endpoint: string }) => {
        try {
            setActionInProgress(true);
            const response = await fetch(`/api/security/alerts/${alertId}/${action.endpoint}`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Erreur lors de l\'exécution de l\'action');

            message.success('Action effectuée avec succès');
            loadAlerts();
            setDetailsVisible(false);
        } catch (error) {
            message.error('Impossible d\'exécuter l\'action');
            console.error('Error executing alert action:', error);
        } finally {
            setActionInProgress(false);
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'critical':
                return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
            case 'warning':
                return <WarningOutlined style={{ color: '#faad14' }} />;
            default:
                return <BellOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'new':
                return <Tag color="red">Nouveau</Tag>;
            case 'in_progress':
                return <Tag color="blue">En cours</Tag>;
            case 'resolved':
                return <Tag color="green">Résolu</Tag>;
            default:
                return null;
        }
    };

    const renderAlertDetails = (alert: SecurityAlert) => (
        <div className="space-y-4">
            <div>
                <Space align="start">
                    {getAlertIcon(alert.type)}
                    <div>
                        <Title level={4} className="mb-1">{alert.title}</Title>
                        <Text type="secondary">
                            {formatDistanceToNow(new Date(alert.timestamp), {
                                addSuffix: true,
                                locale: fr
                            })}
                        </Text>
                    </div>
                </Space>
            </div>

            <Paragraph>{alert.description}</Paragraph>

            {alert.metadata && (
                <div className="bg-gray-50 p-4 rounded">
                    {alert.metadata.location && (
                        <div className="mb-2">
                            <Text type="secondary">
                                <GlobalOutlined className="mr-2" />
                                Localisation
                            </Text>
                            <div>{alert.metadata.location}</div>
                        </div>
                    )}

                    {alert.metadata.deviceInfo && (
                        <div className="mb-2">
                            <Text type="secondary">
                                <UserOutlined className="mr-2" />
                                Appareil
                            </Text>
                            <div>
                                {alert.metadata.deviceInfo.browser} sur {alert.metadata.deviceInfo.os}
                            </div>
                        </div>
                    )}

                    {alert.metadata.riskScore !== undefined && (
                        <div className="mb-2">
                            <Text type="secondary">
                                <SecurityScanOutlined className="mr-2" />
                                Score de risque
                            </Text>
                            <div>{(alert.metadata.riskScore * 100).toFixed(0)}%</div>
                        </div>
                    )}

                    {alert.metadata.ipAddress && (
                        <div>
                            <Text type="secondary">Adresse IP</Text>
                            <div>{alert.metadata.ipAddress}</div>
                        </div>
                    )}
                </div>
            )}

            {alert.actions && alert.actions.length > 0 && (
                <div className="mt-4">
                    <Space>
                        {alert.actions.map((action, index) => (
                            <Button
                                key={index}
                                type={action.type === 'block' ? 'primary' : 'default'}
                                danger={action.type === 'block'}
                                onClick={() => handleAlertAction(alert.id, action)}
                                loading={actionInProgress}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Space>
                </div>
            )}
        </div>
    );

    const filterAlerts = (status: string) => 
        alerts.filter(alert => alert.status === status);

    return (
        <div className="space-y-4">
            <Card>
                <Title level={4}>Centre d'alertes</Title>
                <Text type="secondary" className="mb-4 block">
                    Surveillez et gérez les alertes de sécurité de votre compte.
                </Text>

                <Tabs defaultActiveKey="new">
                    <TabPane
                        tab={
                            <Badge count={filterAlerts('new').length}>
                                <span>Nouvelles alertes</span>
                            </Badge>
                        }
                        key="new"
                    >
                        <AlertList
                            alerts={filterAlerts('new')}
                            loading={loading}
                            onSelectAlert={(alert) => {
                                setSelectedAlert(alert);
                                setDetailsVisible(true);
                            }}
                        />
                    </TabPane>

                    <TabPane tab="En cours" key="in_progress">
                        <AlertList
                            alerts={filterAlerts('in_progress')}
                            loading={loading}
                            onSelectAlert={(alert) => {
                                setSelectedAlert(alert);
                                setDetailsVisible(true);
                            }}
                        />
                    </TabPane>

                    <TabPane tab="Résolues" key="resolved">
                        <AlertList
                            alerts={filterAlerts('resolved')}
                            loading={loading}
                            onSelectAlert={(alert) => {
                                setSelectedAlert(alert);
                                setDetailsVisible(true);
                            }}
                        />
                    </TabPane>
                </Tabs>
            </Card>

            <Modal
                title="Détails de l'alerte"
                open={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                footer={null}
                width={600}
            >
                {selectedAlert && renderAlertDetails(selectedAlert)}
            </Modal>
        </div>
    );
};

interface AlertListProps {
    alerts: SecurityAlert[];
    loading: boolean;
    onSelectAlert: (alert: SecurityAlert) => void;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, loading, onSelectAlert }) => {
    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Spin />
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aucune alerte"
            />
        );
    }

    return (
        <List
            dataSource={alerts}
            renderItem={(alert) => (
                <List.Item
                    actions={[
                        <Button
                            type="link"
                            onClick={() => onSelectAlert(alert)}
                        >
                            Détails
                        </Button>
                    ]}
                >
                    <List.Item.Meta
                        avatar={getAlertIcon(alert.type)}
                        title={
                            <Space>
                                <span>{alert.title}</span>
                                {getStatusTag(alert.status)}
                            </Space>
                        }
                        description={
                            <div>
                                <div>{alert.description}</div>
                                <Text type="secondary">
                                    {formatDistanceToNow(new Date(alert.timestamp), {
                                        addSuffix: true,
                                        locale: fr
                                    })}
                                </Text>
                            </div>
                        }
                    />
                </List.Item>
            )}
        />
    );
};

export default AlertCenter;
