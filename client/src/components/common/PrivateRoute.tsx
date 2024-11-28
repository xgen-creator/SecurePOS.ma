import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { TwoFactorAuth } from '../auth/TwoFactorAuth';

interface PrivateRouteProps {
    children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { user, loading, error } = useAuth();
    const location = useLocation();

    // Attendre le chargement initial
    if (loading) {
        return null;
    }

    // Rediriger vers la connexion si non authentifié
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Vérifier si l'utilisateur a une vérification 2FA en attente
    if (user.pending2FA) {
        return (
            <TwoFactorAuth
                userId={user.id}
                backupCodes={user.backupCodes}
                onVerify={async (code, type) => {
                    // La vérification sera gérée par le hook useAuth
                }}
            />
        );
    }

    // Rendre le composant protégé
    return <>{children}</>;
};
