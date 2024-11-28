import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    HomeOutlined,
    SecurityScanOutlined,
    HistoryOutlined,
    SettingOutlined,
    LogoutOutlined,
    UserOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [collapsed, setCollapsed] = React.useState(false);
    const location = useLocation();

    const menuItems = [
        {
            key: 'dashboard',
            icon: <HomeOutlined />,
            label: <Link to="/dashboard">Dashboard</Link>,
        },
        {
            key: 'security',
            icon: <SecurityScanOutlined />,
            label: <Link to="/security">Sécurité</Link>,
        },
        {
            key: 'history',
            icon: <HistoryOutlined />,
            label: <Link to="/history">Historique</Link>,
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: <Link to="/settings">Paramètres</Link>,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Déconnexion',
            onClick: logout,
            className: 'mt-auto'
        }
    ];

    return (
        <Layout className="min-h-screen">
            <Sider 
                collapsible 
                collapsed={collapsed} 
                onCollapse={setCollapsed}
                className="bg-gray-900"
            >
                <div className="h-16 flex items-center justify-center">
                    <img 
                        src="/logo.png" 
                        alt="Scanbell" 
                        className="h-8"
                    />
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    className="border-r-0 bg-gray-900"
                    selectedKeys={[location.pathname.split('/')[1] || 'dashboard']}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header className="bg-white px-6 flex items-center justify-between shadow-sm">
                    <h1 className="text-xl font-semibold text-gray-800">
                        Scanbell Security
                    </h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                            Bienvenue, {/* userName */}
                        </span>
                    </div>
                </Header>
                <Content className="m-6">
                    <div className="p-6 bg-white rounded-xl shadow-sm min-h-[calc(100vh-160px)]">
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default DashboardLayout;
