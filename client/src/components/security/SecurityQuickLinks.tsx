import React from 'react';
import { Card, Row, Col, Button, Badge, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
    SecurityScanOutlined,
    BellOutlined,
    SettingOutlined,
    MobileOutlined,
    LockOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface QuickLink {
    key: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    to: string;
    badge?: {
        count: number;
        status: 'success' | 'error' | 'warning' | 'processing';
    };
    highlight?: boolean;
}

interface SecurityQuickLinksProps {
    alertCount?: number;
    deviceCount?: number;
    has2FA?: boolean;
}

const SecurityQuickLinks: React.FC<SecurityQuickLinksProps> = ({
    alertCount = 0,
    deviceCount = 0,
    has2FA = false
}) => {
    const quickLinks: QuickLink[] = [
        {
            key: 'alerts',
            icon: <BellOutlined className="text-2xl" />,
            title: 'Centre d\'alertes',
            description: 'Consultez et gérez vos alertes de sécurité',
            to: '/security/alerts',
            badge: alertCount > 0 ? {
                count: alertCount,
                status: 'error'
            } : undefined,
            highlight: alertCount > 0
        },
        {
            key: 'devices',
            icon: <MobileOutlined className="text-2xl" />,
            title: 'Appareils connectés',
            description: `${deviceCount} appareil${deviceCount > 1 ? 's' : ''} actif${deviceCount > 1 ? 's' : ''}`,
            to: '/security/devices',
            badge: {
                count: deviceCount,
                status: 'processing'
            }
        },
        {
            key: '2fa',
            icon: <SafetyCertificateOutlined className="text-2xl" />,
            title: 'Double authentification',
            description: has2FA ? 'Activée' : 'Non configurée',
            to: '/security/preferences#2fa',
            badge: {
                count: has2FA ? 1 : 0,
                status: has2FA ? 'success' : 'warning'
            },
            highlight: !has2FA
        },
        {
            key: 'security-check',
            icon: <SecurityScanOutlined className="text-2xl" />,
            title: 'Vérification de sécurité',
            description: 'Analysez la sécurité de votre compte',
            to: '/security/preferences#security-check'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Text strong className="text-lg">Accès rapide</Text>
                    <Text type="secondary" className="block">
                        Gérez rapidement la sécurité de votre compte
                    </Text>
                </div>
                <Link to="/security/preferences">
                    <Button type="link" icon={<SettingOutlined />}>
                        Tous les paramètres
                    </Button>
                </Link>
            </div>

            <Row gutter={[16, 16]}>
                {quickLinks.map(link => (
                    <Col key={link.key} xs={24} sm={12} md={8} lg={6}>
                        <Link to={link.to} className="block h-full">
                            <Card
                                hoverable
                                className={`h-full ${link.highlight ? 'border-warning-light' : ''}`}
                                bodyStyle={{ height: '100%' }}
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${
                                            link.highlight ? 'bg-warning-light text-warning' : 'bg-primary-light text-primary'
                                        }`}>
                                            {link.icon}
                                        </div>
                                        {link.badge && (
                                            <Badge
                                                count={link.badge.count}
                                                status={link.badge.status}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <Text strong className="block mb-1">
                                            {link.title}
                                        </Text>
                                        <Text type="secondary" className="text-sm">
                                            {link.description}
                                        </Text>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </Col>
                ))}
            </Row>

            {/* Bannière de sécurité */}
            {!has2FA && (
                <Card className="bg-warning-light border-warning mt-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <LockOutlined className="text-2xl text-warning" />
                        </div>
                        <div className="flex-grow">
                            <Text strong className="block">
                                Renforcez la sécurité de votre compte
                            </Text>
                            <Text type="secondary">
                                La double authentification n'est pas activée. Activez-la pour mieux protéger votre compte.
                            </Text>
                        </div>
                        <div className="flex-shrink-0">
                            <Link to="/security/preferences#2fa">
                                <Button type="primary" danger>
                                    Activer maintenant
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SecurityQuickLinks;
