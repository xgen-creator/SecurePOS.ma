import { generateQRCode } from '../../utils/qr-generator';
import QRCode from 'qrcode';

// Mock the QRCode module
jest.mock('qrcode', () => ({
    toDataURL: jest.fn()
}));

describe('QR Code Generator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('generates QR code with default options', async () => {
        const mockData = 'test-data';
        const mockQRCode = 'data:image/png;base64,mockQRCode';
        
        (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRCode);

        const result = await generateQRCode(mockData);

        expect(result).toBe(mockQRCode);
        expect(QRCode.toDataURL).toHaveBeenCalledWith(mockData, expect.objectContaining({
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 1
        }));
    });

    it('generates QR code with custom options', async () => {
        const mockData = 'test-data';
        const mockQRCode = 'data:image/png;base64,mockQRCode';
        const customOptions = {
            errorCorrectionLevel: 'L' as const,
            quality: 0.8,
            margin: 2,
            color: {
                dark: '#FF0000',
                light: '#FFFFFF'
            }
        };

        (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRCode);

        const result = await generateQRCode(mockData, customOptions);

        expect(result).toBe(mockQRCode);
        expect(QRCode.toDataURL).toHaveBeenCalledWith(mockData, expect.objectContaining(customOptions));
    });

    it('handles generation errors', async () => {
        const mockError = new Error('QR code generation failed');
        (QRCode.toDataURL as jest.Mock).mockRejectedValue(mockError);

        await expect(generateQRCode('test-data'))
            .rejects.toThrow('QR code generation failed');
    });
});
