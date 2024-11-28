import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import SecurityDashboard from '../SecurityDashboard';
import { useAuth } from '../../../hooks/useAuth';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('SecurityDashboard Component', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
  };

  const mockSecurityScore = {
    overall: 85,
    factors: {
      twoFactor: 100,
      passwordStrength: 80,
      deviceTrust: 75,
      recentActivity: 85,
    },
  };

  const mockAlerts = [
    {
      id: '1',
      type: 'warning',
      message: 'Tentative de connexion depuis une nouvelle localisation',
      timestamp: '2024-01-20T10:00:00Z',
    },
    {
      id: '2',
      type: 'info',
      message: 'Double authentification activée',
      timestamp: '2024-01-19T15:30:00Z',
    },
  ];

  const mockActivity = [
    {
      id: '1',
      type: 'login',
      location: 'Paris, France',
      device: 'Chrome on Windows',
      timestamp: '2024-01-20T10:00:00Z',
      status: 'success',
    },
    {
      id: '2',
      type: 'device',
      location: 'Lyon, France',
      device: 'Firefox on MacOS',
      timestamp: '2024-01-19T15:30:00Z',
      status: 'blocked',
    },
  ];

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    mockedAxios.get.mockReset();

    // Mock initial data loading
    mockedAxios.get
      .mockImplementation((url) => {
        switch (url) {
          case '/api/security/score':
            return Promise.resolve({ data: mockSecurityScore });
          case '/api/security/alerts':
            return Promise.resolve({ data: mockAlerts });
          case '/api/security/activity':
            return Promise.resolve({ data: mockActivity });
          default:
            return Promise.reject(new Error('Not found'));
        }
      });
  });

  it('renders security dashboard with all sections', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      // Check main sections
      expect(screen.getByText('Tableau de bord de sécurité')).toBeInTheDocument();
      expect(screen.getByText('Score de sécurité')).toBeInTheDocument();
      expect(screen.getByText('Alertes de sécurité')).toBeInTheDocument();
      expect(screen.getByText('Activité récente')).toBeInTheDocument();
    });
  });

  it('displays security score and factors', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      // Check overall score
      expect(screen.getByText('85%')).toBeInTheDocument();

      // Check factors
      expect(screen.getByText('Double authentification')).toBeInTheDocument();
      expect(screen.getByText('Force du mot de passe')).toBeInTheDocument();
      expect(screen.getByText('Appareils de confiance')).toBeInTheDocument();
    });
  });

  it('displays security alerts', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      mockAlerts.forEach(alert => {
        expect(screen.getByText(alert.message)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(new Date(alert.timestamp).toLocaleString()))).toBeInTheDocument();
      });
    });
  });

  it('displays recent activity', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      mockActivity.forEach(activity => {
        expect(screen.getByText(new RegExp(activity.device))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(activity.location))).toBeInTheDocument();
        expect(screen.getByText(activity.status)).toBeInTheDocument();
      });
    });
  });

  it('refreshes dashboard data when refresh button is clicked', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/score');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/alerts');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/activity');
    });

    // Reset mock calls
    mockedAxios.get.mockReset();
    mockedAxios.get
      .mockImplementation((url) => {
        switch (url) {
          case '/api/security/score':
            return Promise.resolve({ data: { ...mockSecurityScore, overall: 90 } });
          case '/api/security/alerts':
            return Promise.resolve({ data: mockAlerts });
          case '/api/security/activity':
            return Promise.resolve({ data: mockActivity });
          default:
            return Promise.reject(new Error('Not found'));
        }
      });

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /rafraîchir/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/score');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/alerts');
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/security/activity');
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  it('displays appropriate icons for different alert types', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      const warningAlert = mockAlerts.find(alert => alert.type === 'warning');
      const infoAlert = mockAlerts.find(alert => alert.type === 'info');

      expect(screen.getByText(warningAlert!.message)).toBeInTheDocument();
      expect(screen.getByText(infoAlert!.message)).toBeInTheDocument();
    });
  });

  it('displays appropriate status colors for different activity types', async () => {
    render(<SecurityDashboard />);

    await waitFor(() => {
      const successActivity = mockActivity.find(activity => activity.status === 'success');
      const blockedActivity = mockActivity.find(activity => activity.status === 'blocked');

      expect(screen.getByText(successActivity!.status)).toHaveClass(/success/);
      expect(screen.getByText(blockedActivity!.status)).toHaveClass(/warning/);
    });
  });

  it('handles error when loading dashboard data', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Failed to load data'));

    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erreur lors du chargement des données:',
        expect.any(Error)
      );
    });
  });

  it('displays security recommendations based on score factors', async () => {
    const lowScoreData = {
      ...mockSecurityScore,
      factors: {
        ...mockSecurityScore.factors,
        twoFactor: 0,
        passwordStrength: 60,
        deviceTrust: 40,
      },
    };

    mockedAxios.get
      .mockImplementationOnce((url) => {
        if (url === '/api/security/score') {
          return Promise.resolve({ data: lowScoreData });
        }
        return Promise.reject(new Error('Not found'));
      });

    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Activez l\'authentification à deux facteurs')).toBeInTheDocument();
      expect(screen.getByText('Renforcez votre mot de passe')).toBeInTheDocument();
      expect(screen.getByText('Gérez vos appareils de confiance')).toBeInTheDocument();
    });
  });

  it('disables refresh button while loading', async () => {
    render(<SecurityDashboard />);

    const refreshButton = screen.getByRole('button', { name: /rafraîchir/i });
    fireEvent.click(refreshButton);

    expect(refreshButton).toBeDisabled();

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });
});
