import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tooltip, Modal, Tag, Space } from 'antd';
import {
    GlobalOutlined,
    ClockCircleOutlined,
    LogoutOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Session {
    id: string;
    deviceInfo: {
        browser: string;
        os: string;
        device: string;
    };
    ip: string;
    location: string;
    startTime: string;
    lastActivity: string;
    isCurrent: boolean;
}

const SessionManager: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, contextHolder] = Modal.useModal();

    useEffect(() => {
        fetchActiveSessions();
    }, []);

    const fetchActiveSessions = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/security/sessions');
            const data = await response.json();
            setSessions(data);
        } catch (error) {
            console.error('Erreur lors de la récupération des sessions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTerminateSession = async (sessionId: string) => {
        try {
            await fetch(`/api/security/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            fetchActiveSessions();
        } catch (error) {
            console.error('Erreur lors de la terminaison de la session', error);
        }
    };

    const confirmTerminate = (session: Session) => {
        modal.confirm({
            title: 'Terminer la session ?',
            icon: <ExclamationCircleOutlined />,
            content: `Êtes-vous sûr de vouloir terminer cette session ${session.deviceInfo.browser} ?`,
            okText: 'Terminer',
            cancelText: 'Annuler',
            onOk: () => handleTerminateSession(session.id)
        });
    };

    const handleTerminateAllOther = async () => {
        modal.confirm({
            title: 'Terminer toutes les autres sessions ?',
            icon: <ExclamationCircleOutlined />,
            content: 'Toutes les sessions sauf la session courante seront terminées.',
            okText: 'Terminer tout',
            cancelText: 'Annuler',
            onOk: async () => {
                try {
                    await fetch('/api/security/sessions', {
                        method: 'DELETE'
                    });
                    fetchActiveSessions();
                } catch (error) {
                    console.error('Erreur lors de la terminaison des sessions', error);
                }
            }
        });
    };

    const columns = [
        {
            title: 'Appareil',
            dataIndex: 'deviceInfo',
            key: 'device',
            render: (deviceInfo: Session['deviceInfo']) => (
                <Space direction="vertical" size="small">
                    <div className="font-medium">{deviceInfo.browser}</div>
                    <div className="text-sm text-gray-500">{deviceInfo.os}</div>
                </Space>
            ),
        },
        {
            title: 'Localisation',
            dataIndex: 'location',
            key: 'location',
            render: (location: string, record: Session) => (
                <Space direction="vertical" size="small">
                    <div className="flex items-center space-x-2">
                        <GlobalOutlined />
                        <span>{location}</span>
                    </div>
                    <div className="text-sm text-gray-500">{record.ip}</div>
                </Space>
            ),
        },
        {
            title: 'Activité',
            key: 'activity',
            render: (record: Session) => (
                <Space direction="vertical" size="small">
                    <div className="flex items-center space-x-2">
                        <ClockCircleOutlined />
                        <span>Dernière activité : {dayjs(record.lastActivity).fromNow()}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                        Début : {dayjs(record.startTime).format('DD/MM/YYYY HH:mm')}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Statut',
            key: 'status',
            render: (record: Session) => (
                <Space>
                    {record.isCurrent && (
                        <Tag color="green">Session courante</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: Session) => (
                <Space>
                    {!record.isCurrent && (
                        <Tooltip title="Terminer la session">
                            <Button
                                type="text"
                                danger
                                icon={<LogoutOutlined />}
                                onClick={() => confirmTerminate(record)}
                            >
                                Terminer
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Card
            title="Sessions Actives"
            extra={
                <Button
                    type="primary"
                    danger
                    onClick={handleTerminateAllOther}
                    disabled={sessions.filter(s => !s.isCurrent).length === 0}
                >
                    Terminer les autres sessions
                </Button>
            }
        >
            <Table
                dataSource={sessions}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={false}
            />
            {contextHolder}
        </Card>
    );
};

export default SessionManager;
