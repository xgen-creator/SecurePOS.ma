import React, { useEffect, useState } from 'react';
import {
    Card,
    Progress,
    List,
    Tag,
    Timeline,
    Statistic,
    Row,
    Col,
    Button,
    Spin,
    Empty,
    Alert
} from 'antd';
import {
    SecurityScanOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    MobileOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SecurityReport {
    timestamp: string;
    securityScore: number;
    summary: {
        totalLogins: number;
        activeDevices: number;
        recentIncidents: number;
        securityLevel: string;
    };
    details: {
        loginHistory: any[];
        deviceInfo: any[];
        securitySettings: any;
        recentIncidents: any[];
    };
    recommendations: {
        id: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
        action: string;
        impact: string;
    }[];
    riskAreas: {
        area: string;
        level: string;
        details: string;
    }[];
}

const SecurityReport: React.FC = () => {
    const [report, setReport] = useState<SecurityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
    const [revokingDevice, setRevokingDevice] = useState<string | null>(null);

    useEffect(() => {
        loadSecurityReport();
    }, []);

    const loadSecurityReport = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/security/report');
            if (!response.ok) throw new Error('Erreur lors du chargement du rapport');
            const data = await response.json();
            setReport(data);
        } catch (err) {
            setError('Impossible de charger le rapport de sécurité');
            console.error('Error loading security report:', err);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return '#52c41a';
        if (score >= 70) return '#1890ff';
        if (score >= 50) return '#faad14';
        return '#f5222d';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return '#f5222d';
            case 'high':
                return '#fa8c16';
            case 'medium':
                return '#faad14';
            default:
                return '#52c41a';
        }
    };

    const applyRecommendation = async (recommendationId: string) => {
        try {
            setApplyingRecommendation(recommendationId);
            const response = await fetch(`/api/security/report/recommendation/${recommendationId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to apply recommendation');
            
            // Reload security report to reflect changes
            await loadSecurityReport();
        } catch (err) {
            console.error('Error applying recommendation:', err);
        } finally {
            setApplyingRecommendation(null);
        }
    };

    const revokeDevice = async (deviceId: string) => {
        try {
            setRevokingDevice(deviceId);
            const response = await fetch(`/api/security/devices/${deviceId}/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to revoke device');
            
            // Reload security report to reflect changes
            await loadSecurityReport();
        } catch (err) {
            console.error('Error revoking device:', err);
        } finally {
            setRevokingDevice(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                message="Erreur"
                description={error}
                type="error"
                showIcon
                className="mb-4"
            />
        );
    }

    if (!report) {
        return (
            <Empty
                description="Aucun rapport disponible"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête du rapport */}
            <Card>
                <Row gutter={24} align="middle">
                    <Col span={8}>
                        <Progress
                            type="circle"
                            percent={report.securityScore}
                            format={(percent) => (
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{percent}</div>
                                    <div className="text-sm text-gray-500">Score de sécurité</div>
                                </div>
                            )}
                            strokeColor={getScoreColor(report.securityScore)}
                        />
                    </Col>
                    <Col span={16}>
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Statistic
                                    title="Niveau"
                                    value={report.summary.securityLevel}
                                    prefix={<SecurityScanOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Appareils actifs"
                                    value={report.summary.activeDevices}
                                    prefix={<MobileOutlined />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Incidents récents"
                                    value={report.summary.recentIncidents}
                                    prefix={<ExclamationCircleOutlined />}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* Recommandations */}
            <Card title="Recommandations de sécurité" className="shadow">
                <List
                    dataSource={report.recommendations}
                    renderItem={(item) => (
                        <List.Item
                            extra={
                                <Button 
                                    type="primary"
                                    onClick={() => applyRecommendation(item.id)}
                                    loading={applyingRecommendation === item.id}
                                >
                                    Appliquer
                                </Button>
                            }
                        >
                            <List.Item.Meta
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>{item.action}</span>
                                        <Tag color={getPriorityColor(item.priority)}>
                                            {item.priority}
                                        </Tag>
                                    </div>
                                }
                                description={item.impact}
                            />
                        </List.Item>
                    )}
                />
            </Card>

            {/* Zones de risque */}
            <Card title="Zones de risque identifiées" className="shadow">
                <Timeline mode="left">
                    {report.riskAreas.map((risk, index) => (
                        <Timeline.Item
                            key={index}
                            color={getPriorityColor(risk.level)}
                            dot={<WarningOutlined />}
                        >
                            <div className="font-medium">{risk.area}</div>
                            <div className="text-gray-500">{risk.details}</div>
                        </Timeline.Item>
                    ))}
                </Timeline>
            </Card>

            {/* Historique des connexions */}
            <Card title="Dernières connexions" className="shadow">
                <List
                    dataSource={report.details.loginHistory.slice(0, 5)}
                    renderItem={(login: any) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    login.riskScore >= 0.7 ? (
                                        <ExclamationCircleOutlined className="text-red-500" />
                                    ) : (
                                        <CheckCircleOutlined className="text-green-500" />
                                    )
                                }
                                title={`Connexion depuis ${login.location}`}
                                description={
                                    <div className="space-y-1">
                                        <div>{login.deviceInfo.browser} sur {login.deviceInfo.os}</div>
                                        <div className="text-gray-500">
                                            {formatDistanceToNow(new Date(login.timestamp), {
                                                addSuffix: true,
                                                locale: fr
                                            })}
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>

            {/* Appareils connus */}
            <Card title="Appareils connus" className="shadow">
                <List
                    dataSource={report.details.deviceInfo}
                    renderItem={(device: any) => (
                        <List.Item
                            actions={[
                                <Button
                                    type="text"
                                    danger
                                    onClick={() => revokeDevice(device.id)}
                                    loading={revokingDevice === device.id}
                                >
                                    Révoquer l'accès
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<MobileOutlined />}
                                title={`${device.browser} ${device.browserVersion}`}
                                description={
                                    <div className="space-y-1">
                                        <div>{device.os} {device.osVersion}</div>
                                        <div className="text-gray-500">
                                            Dernière activité : {formatDistanceToNow(
                                                new Date(device.lastSeen),
                                                { addSuffix: true, locale: fr }
                                            )}
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>

            {/* Incidents récents */}
            <Card title="Incidents récents" className="shadow">
                <Timeline>
                    {report.details.recentIncidents.map((incident: any, index: number) => (
                        <Timeline.Item
                            key={index}
                            color={incident.severity === 'high' ? 'red' : 'orange'}
                            dot={<HistoryOutlined />}
                        >
                            <div className="font-medium">{incident.type}</div>
                            <div>{incident.description}</div>
                            <div className="text-gray-500">
                                {formatDistanceToNow(new Date(incident.timestamp), {
                                    addSuffix: true,
                                    locale: fr
                                })}
                            </div>
                        </Timeline.Item>
                    ))}
                </Timeline>
            </Card>

            <div className="text-right text-gray-500">
                Dernière mise à jour : {formatDistanceToNow(new Date(report.timestamp), {
                    addSuffix: true,
                    locale: fr
                })}
            </div>
        </div>
    );
};

export default SecurityReport;
