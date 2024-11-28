import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import TwoFactorSetup from '../TwoFactorSetup';
import { useAuth } from '../../../hooks/useAuth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('TwoFactorSetup Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    mockedAxios.post.mockReset();
  });

  it('renders initial step with method selection', () => {
    render(<TwoFactorSetup />);
    
    expect(screen.getByText('Configuration de la double authentification')).toBeInTheDocument();
    expect(screen.getByText('Application d\'authentification')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('initializes TOTP setup when selected', async () => {
    const mockQrCode = 'data:image/png;base64,mockQrCode';
    const mockSecret = 'ABCDEF123456';

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        qrCodeUrl: mockQrCode,
        secret: mockSecret,
      },
    });

    render(<TwoFactorSetup />);
    
    // Select TOTP method
    const totpCard = screen.getByText('Application d\'authentification').closest('div[role="button"]');
    fireEvent.click(totpCard!);

    // Click next
    const nextButton = screen.getByText('Suivant');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/security/2fa/init', {
        method: '2fa_totp',
      });
      expect(screen.getByText('Scannez le QR code')).toBeInTheDocument();
      expect(screen.getByAltText('QR Code')).toHaveAttribute('src', mockQrCode);
    });
  });

  it('handles verification code submission', async () => {
    const mockBackupCodes = ['123456', '234567', '345678'];
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          qrCodeUrl: 'mockQrCode',
          secret: 'mockSecret',
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          backupCodes: mockBackupCodes,
        },
      });

    render(<TwoFactorSetup />);

    // Navigate to verification step
    await act(async () => {
      const totpCard = screen.getByText('Application d\'authentification').closest('div[role="button"]');
      fireEvent.click(totpCard!);
      const nextButton = screen.getByText('Suivant');
      fireEvent.click(nextButton);
    });

    // Enter verification code
    await act(async () => {
      const nextButton = screen.getByText('Suivant');
      fireEvent.click(nextButton);
      const codeInput = screen.getByLabelText('Code de vérification');
      fireEvent.change(codeInput, { target: { value: '123456' } });
      const verifyButton = screen.getByText('Vérifier');
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenLastCalledWith('/api/security/2fa/verify', {
        method: '2fa_totp',
        code: '123456',
        secret: 'mockSecret',
      });
      expect(screen.getByText('Vos codes de secours')).toBeInTheDocument();
      mockBackupCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });
  });

  it('displays error message on verification failure', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          qrCodeUrl: 'mockQrCode',
          secret: 'mockSecret',
        },
      })
      .mockRejectedValueOnce(new Error('Invalid code'));

    render(<TwoFactorSetup />);

    // Navigate to verification step
    await act(async () => {
      const totpCard = screen.getByText('Application d\'authentification').closest('div[role="button"]');
      fireEvent.click(totpCard!);
      const nextButton = screen.getByText('Suivant');
      fireEvent.click(nextButton);
    });

    // Enter and submit invalid code
    await act(async () => {
      const nextButton = screen.getByText('Suivant');
      fireEvent.click(nextButton);
      const codeInput = screen.getByLabelText('Code de vérification');
      fireEvent.change(codeInput, { target: { value: '000000' } });
      const verifyButton = screen.getByText('Vérifier');
      fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Code de vérification invalide')).toBeInTheDocument();
    });
  });

  it('handles SMS method selection and initialization', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        phoneNumber: '+33612345678',
      },
    });

    render(<TwoFactorSetup />);

    // Select SMS method
    const smsCard = screen.getByText('SMS').closest('div[role="button"]');
    fireEvent.click(smsCard!);

    // Click next
    const nextButton = screen.getByText('Suivant');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/security/2fa/init', {
        method: '2fa_sms',
      });
      expect(screen.getByText('Vérification par SMS')).toBeInTheDocument();
    });
  });

  it('handles email method selection and initialization', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        email: 'test@example.com',
      },
    });

    render(<TwoFactorSetup />);

    // Select Email method
    const emailCard = screen.getByText('Email').closest('div[role="button"]');
    fireEvent.click(emailCard!);

    // Click next
    const nextButton = screen.getByText('Suivant');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/security/2fa/init', {
        method: '2fa_email',
      });
      expect(screen.getByText('Vérification par Email')).toBeInTheDocument();
    });
  });
});
