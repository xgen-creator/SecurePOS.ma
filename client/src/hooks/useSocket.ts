import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export const useSocket = () => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (user && !socketRef.current) {
            // Initialiser la connexion socket avec l'authentification
            socketRef.current = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3001', {
                auth: {
                    userId: user.id
                },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            // Gestion des événements de connexion
            socketRef.current.on('connect', () => {
                console.log('Socket connecté');
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Erreur de connexion socket:', error);
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('Socket déconnecté:', reason);
            });
        }

        // Nettoyage à la déconnexion
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user]);

    return {
        socket: socketRef.current,
        connected: socketRef.current?.connected || false
    };
};
