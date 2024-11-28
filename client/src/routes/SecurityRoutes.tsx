import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import SecurityLayout from '../components/security/SecurityLayout';
import SecurityHome from '../components/security/SecurityHome';
import SecurityPreferences from '../components/security/SecurityPreferences';
import DeviceManagement from '../components/security/DeviceManagement';
import AlertCenter from '../components/security/AlertCenter';
import AdminDashboard from '../components/security/AdminDashboard';
import { useAuth } from '../hooks/useAuth';

const SecurityRoutes: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <SecurityLayout isAdmin={isAdmin}>
            <Routes>
                {/* Page d'accueil */}
                <Route path="/" element={<SecurityHome />} />

                {/* Routes accessibles à tous les utilisateurs */}
                <Route path="/preferences" element={<SecurityPreferences />} />
                <Route path="/devices" element={<DeviceManagement />} />
                <Route path="/alerts" element={<AlertCenter />} />

                {/* Route admin protégée */}
                {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}

                {/* Redirection des chemins inconnus vers la page d'accueil */}
                <Route path="*" element={<Navigate to="/security" replace />} />
            </Routes>
        </SecurityLayout>
    );
};

export default SecurityRoutes;
