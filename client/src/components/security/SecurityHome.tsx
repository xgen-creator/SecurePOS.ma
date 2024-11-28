import React, { useEffect, useState } from 'react';
import { Card, Alert, Spin, Typography } from 'antd';
import SecurityQuickLinks from './SecurityQuickLinks';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

interface SecurityStats {
    alertCount: number;
    deviceCount: number;
    has2FA: boolean;
    lastLoginAttempt?: {
        timestamp: string;
        location: string;
        device: string;
        status: 'success' | 'failed';
    };
    securityScore: number;
}

const SecurityHome: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        loadSecurityStats();
    }, []);

    const loadSecurityStats = async () => {
        try {
            const response = await fetch('/api/security/stats');
            if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error loading security stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spin size="large" />
            </div>
        );
    }

    if (!stats) {
        return (
            <Alert
                type="error"
                message="Erreur"
                description="Impossible de charger les informations de sécurité"
                className="mb-6"
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="mb-8">
                <Title level={2}>
                    Bienvenue, {user?.name}
                </Title>
                <Text type="secondary">
                    Gérez la sécurité de votre compte et restez informé des activités importantes
                </Text>
            </div>

            {/* Score de sécurité */}
            {stats.securityScore < 80 && (
                <Alert
                    type="warning"
                    message="Améliorez la sécurité de votre compte"
                    description={`Votre score de sécurité est de ${stats.securityScore}%. Suivez nos recommandations pour mieux protéger votre compte.`}
                    className="mb-6"
                />
            )}

            {/* Dernière connexion */}
            {stats.lastLoginAttempt && (
                <Card size="small" className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Text type="secondary">Dernière connexion</Text>
                            <div className="font-medium">
                                {new Date(stats.lastLoginAttempt.timestamp).toLocaleString('fr-FR')}
                            </div>
                        </div>
                        <div className="text-right">
                            <Text type="secondary">Depuis</Text>
                            <div className="font-medium">
                                {stats.lastLoginAttempt.location}
                            </div>
                        </div>
                        <div className="text-right">
                            <Text type="secondary">Appareil</Text>
                            <div className="font-medium">
                                {stats.lastLoginAttempt.device}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Liens rapides */}
            <SecurityQuickLinks
                alertCount={stats.alertCount}
                deviceCount={stats.deviceCount}
                has2FA={stats.has2FA}
            />

            {/* Recommandations de sécurité */}
            {stats.securityScore < 100 && (
                <Card title="Recommandations de sécurité" className="mt-6">
                    <div className="space-y-4">
                        {!stats.has2FA && (
                            <div>
                                <Text strong className="block">
                                    Activez la double authentification
                                </Text>
                                <Text type="secondary">
                                    Ajoutez une couche de sécurité supplémentaire à votre compte.
                                </Text>
                            </div>
                        )}
                        {stats.deviceCount > 5 && (
                            <div>
                                <Text strong className="block">
                                    Vérifiez vos appareils connectés
                                </Text>
                                <Text type="secondary">
                                    Vous avez {stats.deviceCount} appareils connectés. Assurez-vous de reconnaître tous ces appareils.
                                </Text>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SecurityHome;
