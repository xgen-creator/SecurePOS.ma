import React, { useEffect, useState } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Table,
    Button,
    Typography,
    Progress,
    Space,
    DatePicker,
    Select,
    Alert,
    Tag
} from 'antd';
import {
    UserOutlined,
    SecurityScanOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    GlobalOutlined,
    LockOutlined,
    ApiOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface SecurityMetrics {
    totalUsers: number;
    activeUsers24h: number;
    averageRiskScore: number;
    totalAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    twoFactorAdoption: number;
    blockedAttempts: number;
}

interface SecurityTrend {
    timestamp: string;
    metric: string;
    value: number;
}

interface RecentActivity {
    id: string;
    type: string;
    user: string;
    description: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    status: string;
}

const AdminDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
    const [trends, setTrends] = useState<SecurityTrend[]>([]);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<[Date, Date]>([
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
    ]);
    const [selectedMetric, setSelectedMetric] = useState<string>('risk_score');

    useEffect(() => {
        loadDashboardData();
    }, [timeRange, selectedMetric]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // Charger les métriques
            const metricsResponse = await fetch('/api/admin/security/metrics');
            const metricsData = await metricsResponse.json();
            setMetrics(metricsData);

            // Charger les tendances
            const trendsResponse = await fetch('/api/admin/security/trends', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate: timeRange[0].toISOString(),
                    endDate: timeRange[1].toISOString(),
                    metric: selectedMetric
                })
            });
            const trendsData = await trendsResponse.json();
            setTrends(trendsData);

            // Charger les activités récentes
            const activitiesResponse = await fetch('/api/admin/security/activities');
            const activitiesData = await activitiesResponse.json();
            setActivities(activitiesData);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return '#f5222d';
            case 'medium':
                return '#faad14';
            default:
                return '#52c41a';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved':
                return 'success';
            case 'in_progress':
                return 'processing';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (text: string) => (
                <Space>
                    {text === 'login_attempt' ? <LockOutlined /> : <ApiOutlined />}
                    <span>{text}</span>
                </Space>
            )
        },
        {
            title: 'Utilisateur',
            dataIndex: 'user',
            key: 'user'
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: 'Sévérité',
            dataIndex: 'severity',
            key: 'severity',
            render: (severity: string) => (
                <Tag color={getSeverityColor(severity)}>
                    {severity.toUpperCase()}
                </Tag>
            )
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (date: string) => (
                formatDistanceToNow(new Date(date), {
                    addSuffix: true,
                    locale: fr
                })
            )
        }
    ];

    const config = {
        data: trends,
        xField: 'timestamp',
        yField: 'value',
        seriesField: 'metric',
        smooth: true,
        animation: {
            appear: {
                animation: 'path-in',
                duration: 1000
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* En-tête du tableau de bord */}
            <Card>
                <Title level={4}>Tableau de bord administrateur</Title>
                <Text type="secondary" className="mb-6 block">
                    Surveillance et gestion de la sécurité du système
                </Text>

                {/* Filtres */}
                <div className="mb-6">
                    <Space size="large">
                        <RangePicker
                            value={[timeRange[0], timeRange[1]]}
                            onChange={(dates) => {
                                if (dates) {
                                    setTimeRange([dates[0], dates[1]]);
                                }
                            }}
                        />
                        <Select
                            value={selectedMetric}
                            onChange={setSelectedMetric}
                            style={{ width: 200 }}
                        >
                            <Option value="risk_score">Score de risque</Option>
                            <Option value="login_attempts">Tentatives de connexion</Option>
                            <Option value="alerts">Alertes</Option>
                        </Select>
                    </Space>
                </div>

                {/* Métriques principales */}
                <Row gutter={[16, 16]}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Utilisateurs actifs (24h)"
                                value={metrics?.activeUsers24h}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Score de risque moyen"
                                value={metrics?.averageRiskScore}
                                suffix="%"
                                precision={1}
                                prefix={<SecurityScanOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Alertes critiques"
                                value={metrics?.criticalAlerts}
                                prefix={<WarningOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Adoption 2FA"
                                value={metrics?.twoFactorAdoption}
                                suffix="%"
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* Graphique des tendances */}
            <Card title="Tendances de sécurité">
                <Line {...config} />
            </Card>

            {/* Activités récentes */}
            <Card title="Activités récentes">
                <Table
                    columns={columns}
                    dataSource={activities}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Statistiques détaillées */}
            <Row gutter={16}>
                <Col span={12}>
                    <Card title="Répartition des alertes">
                        <div className="space-y-4">
                            <div>
                                <Text>Critiques</Text>
                                <Progress
                                    percent={metrics?.criticalAlerts / metrics?.totalAlerts * 100}
                                    status="exception"
                                />
                            </div>
                            <div>
                                <Text>Résolues</Text>
                                <Progress
                                    percent={metrics?.resolvedAlerts / metrics?.totalAlerts * 100}
                                    status="success"
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Sécurité du système">
                        <div className="space-y-4">
                            <Alert
                                message="État du système"
                                description="Tous les services de sécurité sont opérationnels"
                                type="success"
                                showIcon
                            />
                            <div>
                                <Text>Protection 2FA</Text>
                                <Progress percent={metrics?.twoFactorAdoption} />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;
