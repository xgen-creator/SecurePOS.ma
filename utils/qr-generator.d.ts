interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: string;
    quality?: number;
    margin?: number;
    color?: {
        dark: string;
        light: string;
    };
}

export function generateQRCode(data: string, options?: QRCodeOptions): Promise<string>;
