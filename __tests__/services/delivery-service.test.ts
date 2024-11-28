import { jest } from '@jest/globals';
import deliveryService from '../../services/delivery-service';
import { generateQRCode } from '../../utils/qr-generator';
import firebase from 'firebase-admin';

// Mock Firebase
jest.mock('firebase-admin', () => ({
    firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            add: jest.fn(),
            doc: jest.fn(() => ({
                set: jest.fn(),
                get: jest.fn(),
                update: jest.fn()
            })),
            where: jest.fn(() => ({
                get: jest.fn()
            })),
            orderBy: jest.fn(() => ({
                get: jest.fn()
            }))
        }))
    })),
    FieldValue: {
        serverTimestamp: jest.fn(),
        arrayUnion: jest.fn()
    }
}));

// Mock QR Generator
jest.mock('../../utils/qr-generator', () => ({
    generateQRCode: jest.fn()
}));

const mockGenerateQRCode = generateQRCode as jest.MockedFunction<typeof generateQRCode>;
const mockFirestore = firebase.firestore as jest.MockedFunction<typeof firebase.firestore>;

describe('DeliveryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createDeliveryRequest', () => {
        it('should create a delivery request successfully', async () => {
            const mockUserId = 'user123';
            const mockDetails = {
                instructions: 'Leave at door',
                dropZone: 'front'
            };
            const mockQRCode = 'data:image/png;base64,mockQRCode';
            const mockDocRef = { id: 'delivery123' };

            mockGenerateQRCode.mockResolvedValue(mockQRCode);
            const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
            mockFirestore().collection.mockReturnValue({
                add: mockAdd
            } as any);

            const result = await deliveryService.createDeliveryRequest(mockUserId, mockDetails);

            expect(result).toEqual({
                deliveryId: 'delivery123',
                accessCode: expect.any(String),
                qrCode: mockQRCode
            });
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                userId: mockUserId,
                status: 'pending',
                details: mockDetails
            }));
        });

        it('should handle errors during creation', async () => {
            const mockError = new Error('Database error');
            mockFirestore().collection.mockReturnValue({
                add: jest.fn().mockRejectedValue(mockError)
            } as any);

            await expect(deliveryService.createDeliveryRequest('user123', {}))
                .rejects.toThrow('Database error');
        });
    });

    describe('validateDeliveryAccess', () => {
        it('should validate access code successfully', async () => {
            const mockDelivery = {
                id: 'delivery123',
                data: () => ({
                    dropZone: 'front',
                    instructions: 'Leave at door',
                    details: {}
                })
            };
            const mockSnapshot = {
                empty: false,
                docs: [mockDelivery]
            };
            mockFirestore().collection.mockReturnValue({
                where: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(mockSnapshot)
                    })
                })
            } as any);

            const result = await deliveryService.validateDeliveryAccess('ABC123', 'carrier123');

            expect(result).toEqual({
                valid: true,
                delivery: {
                    id: 'delivery123',
                    dropZone: 'front',
                    instructions: 'Leave at door'
                }
            });
        });

        it('should reject invalid access code', async () => {
            const mockSnapshot = {
                empty: true,
                docs: []
            };
            mockFirestore().collection.mockReturnValue({
                where: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(mockSnapshot)
                    })
                })
            } as any);

            const result = await deliveryService.validateDeliveryAccess('INVALID', 'carrier123');

            expect(result).toEqual({
                valid: false,
                reason: 'Code invalide ou expiré'
            });
        });
    });

    describe('updateDeliveryStatus', () => {
        it('should update delivery status successfully', async () => {
            const mockDeliveryRef = {
                get: jest.fn().mockResolvedValue({
                    data: () => ({
                        userId: 'user123'
                    })
                }),
                update: jest.fn().mockResolvedValue(undefined)
            };
            mockFirestore().collection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDeliveryRef)
            } as any);

            const result = await deliveryService.updateDeliveryStatus(
                'delivery123',
                'delivered',
                { message: 'Package delivered successfully' }
            );

            expect(result).toBe(true);
            expect(mockDeliveryRef.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'delivered'
            }));
        });

        it('should handle update errors', async () => {
            const mockError = new Error('Update failed');
            mockFirestore().collection.mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockRejectedValue(mockError)
                })
            } as any);

            await expect(deliveryService.updateDeliveryStatus('delivery123', 'delivered'))
                .rejects.toThrow('Update failed');
        });
    });

    describe('getDeliveryHistory', () => {
        it('should retrieve delivery history successfully', async () => {
            const mockDeliveries = [
                {
                    id: 'delivery1',
                    data: () => ({
                        status: 'delivered',
                        createdAt: new Date()
                    })
                },
                {
                    id: 'delivery2',
                    data: () => ({
                        status: 'pending',
                        createdAt: new Date()
                    })
                }
            ];
            const mockSnapshot = {
                docs: mockDeliveries
            };
            mockFirestore().collection.mockReturnValue({
                where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(mockSnapshot)
                    })
                })
            } as any);

            const result = await deliveryService.getDeliveryHistory('user123');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({
                id: 'delivery1',
                status: 'delivered'
            }));
        });

        it('should handle history retrieval errors', async () => {
            const mockError = new Error('History retrieval failed');
            mockFirestore().collection.mockReturnValue({
                where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockReturnValue({
                        get: jest.fn().mockRejectedValue(mockError)
                    })
                })
            } as any);

            await expect(deliveryService.getDeliveryHistory('user123'))
                .rejects.toThrow('History retrieval failed');
        });
    });
});
