import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import './index.css';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <ConfigProvider locale={frFR}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ConfigProvider>
    </React.StrictMode>
);
