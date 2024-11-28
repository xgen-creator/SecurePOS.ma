import { useState, useCallback } from 'react';
import axios from 'axios';

interface LoginResponse {
    status: 'success' | 'pending_2fa';
    token?: string;
    userId?: string;
    backupCodes?: string[];
    message?: string;
}

interface UseAuthReturn {
    loading: boolean;
    error: string | null;
    user: any | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    verify2FA: (userId: string, code: string, type?: '2fa' | 'backup') => Promise<void>;
    setup2FA: (userId: string, method: 'email' | 'sms') => Promise<void>;
    disable2FA: (userId: string) => Promise<void>;
    logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any | null>(null);

    const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/auth/login', { email, password });
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
            }
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || 'Erreur de connexion';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const verify2FA = useCallback(async (userId: string, code: string, type: '2fa' | 'backup' = '2fa') => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/auth/verify-2fa', { userId, code, type });
            const { token } = response.data;
            localStorage.setItem('token', token);
            setUser(response.data.user);
        } catch (err) {
            const message = err.response?.data?.error || 'Erreur de vérification';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const setup2FA = useCallback(async (userId: string, method: 'email' | 'sms') => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/auth/setup-2fa', { userId, method });
        } catch (err) {
            const message = err.response?.data?.error || 'Erreur de configuration 2FA';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const disable2FA = useCallback(async (userId: string) => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/auth/disable-2fa', { userId });
        } catch (err) {
            const message = err.response?.data?.error || 'Erreur de désactivation 2FA';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
    }, []);

    return {
        loading,
        error,
        user,
        login,
        verify2FA,
        setup2FA,
        disable2FA,
        logout
    };
};
