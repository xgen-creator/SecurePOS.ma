import React from 'react';
import { Row, Col, Card, Tabs } from 'antd';
import { SecurityScanOutlined, MobileOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import TwoFactorSettings from '../components/security/TwoFactorSettings';
import TrustedDevices from '../components/security/TrustedDevices';
import SessionManager from '../components/security/SessionManager';
import ActivityHistory from '../components/security/ActivityHistory';

const { TabPane } = Tabs;

const SecurityDashboard: React.FC = () => {
    return (
        <div className="p-6">
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card 
                        title="Tableau de Bord de Sécurité" 
                        className="shadow-md"
                    >
                        <Tabs defaultActiveKey="2fa">
                            <TabPane
                                tab={
                                    <span>
                                        <SecurityScanOutlined />
                                        Double Authentification
                                    </span>
                                }
                                key="2fa"
                            >
                                <TwoFactorSettings />
                            </TabPane>

                            <TabPane
                                tab={
                                    <span>
                                        <MobileOutlined />
                                        Appareils de Confiance
                                    </span>
                                }
                                key="devices"
                            >
                                <TrustedDevices />
                            </TabPane>

                            <TabPane
                                tab={
                                    <span>
                                        <SettingOutlined />
                                        Sessions Actives
                                    </span>
                                }
                                key="sessions"
                            >
                                <SessionManager />
                            </TabPane>

                            <TabPane
                                tab={
                                    <span>
                                        <HistoryOutlined />
                                        Historique d'Activité
                                    </span>
                                }
                                key="activity"
                            >
                                <ActivityHistory />
                            </TabPane>
                        </Tabs>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SecurityDashboard;
