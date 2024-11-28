import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import SecurityPreferences from '../SecurityPreferences';
import { useAuth } from '../../../hooks/useAuth';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('SecurityPreferences Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
  };

  const mockPreferences = {
    twoFactorEnabled: false,
    deviceTrustEnabled: true,
    locationTrackingEnabled: false,
    securityAlertsEnabled: true,
  };

  const mockTrustedDevices = [
    {
      id: '1',
      name: 'Chrome on Windows',
      lastUsed: '2024-01-20T10:00:00Z',
      browser: 'Chrome',
      os: 'Windows',
    },
    {
      id: '2',
      name: 'Firefox on MacOS',
      lastUsed: '2024-01-19T15:30:00Z',
      browser: 'Firefox',
      os: 'MacOS',
    },
  ];

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();

    // Mock initial data loading
    mockedAxios.get
      .mockImplementation((url) => {
        switch (url) {
          case '/api/security/preferences':
            return Promise.resolve({ data: mockPreferences });
          case '/api/security/devices':
            return Promise.resolve({ data: mockTrustedDevices });
          default:
            return Promise.reject(new Error('Not found'));
        }
      });
  });

  it('renders security preferences and trusted devices', async () => {
    render(<SecurityPreferences />);

    await waitFor(() => {
      // Check preferences section
      expect(screen.getByText('Préférences de sécurité')).toBeInTheDocument();
      expect(screen.getByText('Double authentification')).toBeInTheDocument();
      expect(screen.getByText('Appareils de confiance')).toBeInTheDocument();
      expect(screen.getByText('Suivi de localisation')).toBeInTheDocument();
      expect(screen.getByText('Alertes de sécurité')).toBeInTheDocument();

      // Check trusted devices section
      mockTrustedDevices.forEach(device => {
        expect(screen.getByText(device.name)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(device.browser))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(device.os))).toBeInTheDocument();
      });
    });
  });

  it('toggles security preferences', async () => {
    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/preferences');
    });

    // Toggle 2FA
    const twoFactorSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(twoFactorSwitch);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/security/preferences', {
        twoFactorEnabled: true,
      });
    });
  });

  it('removes trusted device', async () => {
    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/devices');
    });

    // Click delete button for first device
    const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /supprimer/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/security/devices/1');
    });
  });

  it('handles error when loading preferences', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Failed to load preferences'));

    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors du chargement des préférences:',
        expect.any(Error)
      );
    });
  });

  it('handles error when updating preferences', async () => {
    mockedAxios.put.mockRejectedValueOnce(new Error('Failed to update preferences'));

    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/preferences');
    });

    // Try to toggle location tracking
    const locationTrackingSwitch = screen.getAllByRole('switch')[2];
    fireEvent.click(locationTrackingSwitch);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors de la mise à jour des préférences:',
        expect.any(Error)
      );
    });
  });

  it('opens 2FA setup dialog when enabling 2FA', async () => {
    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/preferences');
    });

    // Toggle 2FA
    const twoFactorSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(twoFactorSwitch);

    await waitFor(() => {
      expect(screen.getByText('Configuration de la double authentification')).toBeInTheDocument();
    });
  });

  it('handles device trust toggle', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/preferences');
    });

    // Toggle device trust
    const deviceTrustSwitch = screen.getAllByRole('switch')[1];
    fireEvent.click(deviceTrustSwitch);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/security/preferences', {
        deviceTrustEnabled: false,
      });
    });
  });

  it('displays confirmation dialog before device removal', async () => {
    render(<SecurityPreferences />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/devices');
    });

    // Click delete button for first device
    const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i });
    fireEvent.click(deleteButtons[0]);

    // Check if confirmation dialog is shown
    expect(screen.getByText('Supprimer l\'appareil de confiance')).toBeInTheDocument();
    expect(
      screen.getByText('Êtes-vous sûr de vouloir supprimer cet appareil ?')
    ).toBeInTheDocument();

    // Cancel deletion
    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    fireEvent.click(cancelButton);

    // Dialog should be closed
    expect(
      screen.queryByText('Supprimer l\'appareil de confiance')
    ).not.toBeInTheDocument();
  });
});
