import React from 'react';
import { Card, Table, Tag, Button, DatePicker, Space, Select, Input, Typography } from 'antd';
import {
    DownloadOutlined,
    SearchOutlined,
    FilterOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface ActivityLog {
    id: string;
    type: string;
    action: string;
    status: string;
    timestamp: string;
    ip: string;
    location: string;
    device: string;
    details: string;
}

const ActivityHistory: React.FC = () => {
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<ActivityLog[]>([]);
    const [filters, setFilters] = React.useState({
        dateRange: null,
        type: 'all',
        status: 'all'
    });

    // Simuler le chargement des données
    React.useEffect(() => {
        setLoading(true);
        // Simule un appel API
        setTimeout(() => {
            setData([
                {
                    id: '1',
                    type: 'auth',
                    action: 'Connexion',
                    status: 'success',
                    timestamp: '2024-01-20 14:30:00',
                    ip: '192.168.1.1',
                    location: 'Paris, France',
                    device: 'Chrome sur Windows',
                    details: 'Connexion réussie'
                },
                {
                    id: '2',
                    type: 'security',
                    action: 'Modification 2FA',
                    status: 'warning',
                    timestamp: '2024-01-20 14:25:00',
                    ip: '192.168.1.1',
                    location: 'Paris, France',
                    device: 'Chrome sur Windows',
                    details: 'Changement de méthode 2FA'
                },
                // ... autres logs
            ]);
            setLoading(false);
        }, 1000);
    }, [filters]);

    const columns: TableProps<ActivityLog>['columns'] = [
        {
            title: 'Date',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
            sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const config = {
                    success: { color: 'success', icon: <CheckCircleOutlined /> },
                    warning: { color: 'warning', icon: <WarningOutlined /> },
                    pending: { color: 'processing', icon: <ClockCircleOutlined /> },
                    error: { color: 'error', icon: <WarningOutlined /> },
                };
                const statusConfig = config[status as keyof typeof config];
                return (
                    <Tag icon={statusConfig?.icon} color={statusConfig?.color}>
                        {status.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
        },
        {
            title: 'Localisation',
            dataIndex: 'location',
            key: 'location',
        },
        {
            title: 'Appareil',
            dataIndex: 'device',
            key: 'device',
        },
        {
            title: 'Détails',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
        },
    ];

    const handleExport = () => {
        // Logique d'export
    };

    const handleFilterChange = (values: any) => {
        setFilters(prev => ({ ...prev, ...values }));
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <Title level={4}>Historique des activités</Title>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleExport}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Exporter
                    </Button>
                </div>

                <div className="mb-6">
                    <Space wrap className="w-full">
                        <RangePicker
                            showTime
                            onChange={(dates) => handleFilterChange({ dateRange: dates })}
                        />
                        <Select
                            defaultValue="all"
                            style={{ width: 200 }}
                            onChange={(value) => handleFilterChange({ type: value })}
                            options={[
                                { value: 'all', label: 'Tous les types' },
                                { value: 'auth', label: 'Authentification' },
                                { value: 'security', label: 'Sécurité' },
                                { value: 'profile', label: 'Profil' }
                            ]}
                        />
                        <Select
                            defaultValue="all"
                            style={{ width: 200 }}
                            onChange={(value) => handleFilterChange({ status: value })}
                            options={[
                                { value: 'all', label: 'Tous les statuts' },
                                { value: 'success', label: 'Succès' },
                                { value: 'warning', label: 'Avertissement' },
                                { value: 'error', label: 'Erreur' }
                            ]}
                        />
                        <Input
                            placeholder="Rechercher..."
                            prefix={<SearchOutlined />}
                            style={{ width: 200 }}
                        />
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        total: data.length,
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Total ${total} entrées`
                    }}
                />
            </Card>
        </div>
    );
};

export default ActivityHistory;
