const QRCode = require('qrcode');

/**
 * Génère un QR code à partir d'une chaîne de caractères
 * @param {string} data - Données à encoder dans le QR code
 * @param {Object} options - Options de génération du QR code
 * @returns {Promise<string>} - URL data du QR code en base64
 */
const generateQRCode = async (data, options = {}) => {
    try {
        const defaultOptions = {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        };

        const qrOptions = { ...defaultOptions, ...options };
        return await QRCode.toDataURL(data, qrOptions);
    } catch (error) {
        console.error('Erreur génération QR code:', error);
        throw error;
    }
};

module.exports = {
    generateQRCode
};
