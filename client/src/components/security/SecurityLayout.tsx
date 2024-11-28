import React from 'react';
import { Layout } from 'antd';
import SecurityNavigation from './SecurityNavigation';

const { Content } = Layout;

interface SecurityLayoutProps {
    children: React.ReactNode;
    isAdmin?: boolean;
}

const SecurityLayout: React.FC<SecurityLayoutProps> = ({ children, isAdmin = false }) => {
    return (
        <Layout className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
                <SecurityNavigation />
                <Content className="bg-white rounded-lg shadow">
                    {children}
                </Content>
            </div>
        </Layout>
    );
};

export default SecurityLayout;
