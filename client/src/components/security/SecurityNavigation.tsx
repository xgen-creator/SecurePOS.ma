import React from 'react';
import { Menu, Button, Dropdown, Space } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
    SecurityScanOutlined,
    BellOutlined,
    SettingOutlined,
    MobileOutlined,
    DashboardOutlined,
    MenuOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const SecurityNavigation: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const menuItems = [
        {
            key: '/security/preferences',
            icon: <SettingOutlined />,
            label: 'Préférences',
            description: 'Gérez vos paramètres de sécurité',
            to: '/security/preferences'
        },
        {
            key: '/security/devices',
            icon: <MobileOutlined />,
            label: 'Appareils',
            description: 'Gérez vos appareils connectés',
            to: '/security/devices'
        },
        {
            key: '/security/alerts',
            icon: <BellOutlined />,
            label: 'Alertes',
            description: 'Centre de notifications de sécurité',
            to: '/security/alerts'
        }
    ];

    if (isAdmin) {
        menuItems.unshift({
            key: '/security/admin',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
            description: 'Tableau de bord administrateur',
            to: '/security/admin'
        });
    }

    // Menu pour la version mobile
    const mobileMenu = (
        <Menu
            selectedKeys={[location.pathname]}
            items={menuItems.map(item => ({
                key: item.key,
                icon: item.icon,
                label: <Link to={item.to}>{item.label}</Link>
            }))}
        />
    );

    return (
        <>
            {/* Navigation desktop */}
            <div className="hidden md:flex justify-between items-center bg-white p-4 shadow-sm mb-6 rounded-lg">
                <Space size="large">
                    <div className="flex items-center space-x-2">
                        <SecurityScanOutlined className="text-xl text-primary" />
                        <span className="font-semibold">Sécurité</span>
                    </div>
                    <Space size={24}>
                        {menuItems.map(item => (
                            <Link
                                key={item.key}
                                to={item.to}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors
                                    ${location.pathname === item.key
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-gray-50'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </Space>
                </Space>
            </div>

            {/* Navigation mobile */}
            <div className="md:hidden flex justify-between items-center bg-white p-4 shadow-sm mb-6 rounded-lg">
                <div className="flex items-center space-x-2">
                    <SecurityScanOutlined className="text-xl text-primary" />
                    <span className="font-semibold">Sécurité</span>
                </div>
                <Dropdown 
                    overlay={mobileMenu} 
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button type="text" icon={<MenuOutlined />} />
                </Dropdown>
            </div>

            {/* Fil d'Ariane et description */}
            <div className="mb-8">
                <div className="text-sm text-gray-500 mb-1">
                    {menuItems.find(item => item.key === location.pathname)?.label || 'Sécurité'}
                </div>
                <h1 className="text-2xl font-semibold">
                    {menuItems.find(item => item.key === location.pathname)?.description || 'Sécurité du compte'}
                </h1>
            </div>
        </>
    );
};

export default SecurityNavigation;
