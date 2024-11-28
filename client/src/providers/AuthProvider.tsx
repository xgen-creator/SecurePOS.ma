import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth as useAuthHook } from '../hooks/useAuth';

interface AuthContextType {
    user: any;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<any>;
    verify2FA: (userId: string, code: string, type?: '2fa' | 'backup') => Promise<void>;
    setup2FA: (userId: string, method: 'email' | 'sms') => Promise<void>;
    disable2FA: (userId: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useAuthHook();

    // Configurer l'intercepteur Axios pour ajouter le token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    auth.logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [auth]);

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
};
