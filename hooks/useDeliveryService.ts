import { useState, useCallback } from 'react';
import deliveryService from '../services/delivery-service';

export const useDeliveryService = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const getDeliveryHistory = useCallback(async (options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const history = await deliveryService.getDeliveryHistory(options);
            return history;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getDropZoneConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const config = await deliveryService.getDropZoneConfig();
            return config;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const configureDropZone = useCallback(async (config) => {
        setLoading(true);
        setError(null);
        try {
            await deliveryService.configureDropZone(config);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createDeliveryRequest = useCallback(async (details) => {
        setLoading(true);
        setError(null);
        try {
            const result = await deliveryService.createDeliveryRequest(details);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const validateDeliveryAccess = useCallback(async (accessCode, carrierId) => {
        setLoading(true);
        setError(null);
        try {
            const result = await deliveryService.validateDeliveryAccess(accessCode, carrierId);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateDeliveryStatus = useCallback(async (deliveryId, status, details = {}) => {
        setLoading(true);
        setError(null);
        try {
            await deliveryService.updateDeliveryStatus(deliveryId, status, details);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getDeliveryHistory,
        getDropZoneConfig,
        configureDropZone,
        createDeliveryRequest,
        validateDeliveryAccess,
        updateDeliveryStatus
    };
};

export default useDeliveryService;
