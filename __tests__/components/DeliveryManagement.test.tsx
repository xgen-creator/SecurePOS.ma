import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import DeliveryManagement from '../../components/DeliveryManagement';
import { useDeliveryService } from '../../hooks/useDeliveryService';

// Mock the delivery service hook
jest.mock('../../hooks/useDeliveryService');

const mockDeliveries = [
    {
        id: 'delivery1',
        status: 'pending',
        accessCode: 'ABC123',
        tracking: {
            events: [
                {
                    type: 'created',
                    timestamp: new Date(),
                    details: 'Delivery created'
                }
            ]
        },
        details: {
            instructions: 'Leave at door'
        }
    },
    {
        id: 'delivery2',
        status: 'delivered',
        accessCode: 'XYZ789',
        tracking: {
            events: [
                {
                    type: 'created',
                    timestamp: new Date(),
                    details: 'Delivery created'
                },
                {
                    type: 'delivered',
                    timestamp: new Date(),
                    details: 'Package delivered successfully',
                    photo: 'delivery-photo.jpg'
                }
            ]
        },
        details: {
            instructions: 'Hand to resident'
        }
    }
];

const mockZoneConfig = {
    location: 'Front door',
    instructions: 'Ring doorbell',
    photo_required: true,
    signature_required: false,
    allowed_hours: {
        start: '08:00',
        end: '20:00'
    }
};

describe('DeliveryManagement', () => {
    beforeEach(() => {
        (useDeliveryService as jest.Mock).mockReturnValue({
            loading: false,
            error: null,
            getDeliveryHistory: jest.fn().mockResolvedValue(mockDeliveries),
            getDropZoneConfig: jest.fn().mockResolvedValue(mockZoneConfig),
            configureDropZone: jest.fn().mockResolvedValue(true)
        });
    });

    it('renders delivery management interface', async () => {
        await act(async () => {
            render(<DeliveryManagement />);
        });

        expect(screen.getByText('Gestion des livraisons')).toBeInTheDocument();
        expect(screen.getByText('En attente')).toBeInTheDocument();
        expect(screen.getByText('Livrées')).toBeInTheDocument();
        expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('displays delivery cards with correct information', async () => {
        await act(async () => {
            render(<DeliveryManagement />);
        });

        expect(screen.getByText('Livraison #' + mockDeliveries[0].id.slice(-6))).toBeInTheDocument();
        expect(screen.getByText(`Code d'accès: ${mockDeliveries[0].accessCode}`)).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('opens configuration modal on button click', async () => {
        await act(async () => {
            render(<DeliveryManagement />);
        });

        fireEvent.click(screen.getByText('Configuration'));

        expect(screen.getByText('Configuration de la zone de livraison')).toBeInTheDocument();
        expect(screen.getByText('Emplacement')).toBeInTheDocument();
        expect(screen.getByText('Instructions')).toBeInTheDocument();
    });

    it('handles zone configuration updates', async () => {
        const mockConfigureDropZone = jest.fn().mockResolvedValue(true);
        (useDeliveryService as jest.Mock).mockReturnValue({
            loading: false,
            error: null,
            getDeliveryHistory: jest.fn().mockResolvedValue(mockDeliveries),
            getDropZoneConfig: jest.fn().mockResolvedValue(mockZoneConfig),
            configureDropZone: mockConfigureDropZone
        });

        await act(async () => {
            render(<DeliveryManagement />);
        });

        fireEvent.click(screen.getByText('Configuration'));

        const locationInput = screen.getByPlaceholderText('Ex: Devant la porte');
        fireEvent.change(locationInput, { target: { value: 'Back door' } });

        const instructionsInput = screen.getByPlaceholderText('Instructions pour le livreur...');
        fireEvent.change(instructionsInput, { target: { value: 'Use side entrance' } });

        await act(async () => {
            fireEvent.click(screen.getByText('Enregistrer'));
        });

        expect(mockConfigureDropZone).toHaveBeenCalledWith(expect.objectContaining({
            location: 'Back door',
            instructions: 'Use side entrance'
        }));
    });

    it('handles errors gracefully', async () => {
        const mockError = 'Failed to load deliveries';
        (useDeliveryService as jest.Mock).mockReturnValue({
            loading: false,
            error: mockError,
            getDeliveryHistory: jest.fn().mockRejectedValue(new Error(mockError)),
            getDropZoneConfig: jest.fn().mockResolvedValue(mockZoneConfig)
        });

        await act(async () => {
            render(<DeliveryManagement />);
        });

        expect(screen.getByText('Erreur')).toBeInTheDocument();
        expect(screen.getByText(mockError)).toBeInTheDocument();
    });

    it('shows loading state', async () => {
        (useDeliveryService as jest.Mock).mockReturnValue({
            loading: true,
            error: null,
            getDeliveryHistory: jest.fn().mockResolvedValue([]),
            getDropZoneConfig: jest.fn().mockResolvedValue(mockZoneConfig)
        });

        await act(async () => {
            render(<DeliveryManagement />);
        });

        expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });

    it('filters deliveries by status', async () => {
        await act(async () => {
            render(<DeliveryManagement />);
        });

        // Switch to delivered tab
        fireEvent.click(screen.getByText('Livrées'));

        await waitFor(() => {
            expect(screen.getByText('Livraison #' + mockDeliveries[1].id.slice(-6))).toBeInTheDocument();
            expect(screen.getByText('delivered')).toBeInTheDocument();
        });
    });
});
