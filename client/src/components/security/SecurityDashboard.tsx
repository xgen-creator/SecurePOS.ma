import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security,
  CheckCircle,
  Warning,
  Error,
  Info,
  Refresh,
  LocationOn,
  DevicesOther,
  VpnKey,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface SecurityScore {
  overall: number;
  factors: {
    twoFactor: number;
    passwordStrength: number;
    deviceTrust: number;
    recentActivity: number;
  };
}

interface SecurityAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: string;
}

interface RecentActivity {
  id: string;
  type: string;
  location: string;
  device: string;
  timestamp: string;
  status: 'success' | 'failed' | 'blocked';
}

const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [scoreRes, alertsRes, activityRes] = await Promise.all([
        axios.get('/api/security/score'),
        axios.get('/api/security/alerts'),
        axios.get('/api/security/activity'),
      ]);

      setSecurityScore(scoreRes.data);
      setAlerts(alertsRes.data);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  const getActivityStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'blocked':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          <Security sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Tableau de bord de sécurité
        </Typography>
        <Tooltip title="Rafraîchir">
          <IconButton onClick={loadDashboardData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Score de sécurité */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Score de sécurité
              </Typography>
              {securityScore && (
                <>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h3" color={getScoreColor(securityScore.overall)}>
                      {securityScore.overall}%
                    </Typography>
                    {securityScore.overall >= 80 && (
                      <CheckCircle color="success" sx={{ ml: 1 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Facteurs contributifs :
                  </Typography>
                  <Box>
                    <Typography variant="body2">Double authentification</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={securityScore.factors.twoFactor}
                      color={getScoreColor(securityScore.factors.twoFactor)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2">Force du mot de passe</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={securityScore.factors.passwordStrength}
                      color={getScoreColor(securityScore.factors.passwordStrength)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2">Appareils de confiance</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={securityScore.factors.deviceTrust}
                      color={getScoreColor(securityScore.factors.deviceTrust)}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alertes de sécurité */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alertes de sécurité
              </Typography>
              <List>
                {alerts.length === 0 ? (
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Aucune alerte"
                      secondary="Votre compte est sécurisé"
                    />
                  </ListItem>
                ) : (
                  alerts.map((alert) => (
                    <ListItem key={alert.id}>
                      <ListItemIcon>{getAlertIcon(alert.type)}</ListItemIcon>
                      <ListItemText
                        primary={alert.message}
                        secondary={new Date(alert.timestamp).toLocaleString()}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Activité récente */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activité récente
              </Typography>
              <List>
                {recentActivity.map((activity) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {activity.type === 'login' ? (
                        <VpnKey />
                      ) : activity.type === 'device' ? (
                        <DevicesOther />
                      ) : (
                        <LocationOn />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {activity.type === 'login'
                              ? 'Tentative de connexion'
                              : activity.type === 'device'
                              ? 'Nouvel appareil'
                              : 'Nouvelle localisation'}
                          </Typography>
                          <Chip
                            label={activity.status}
                            size="small"
                            color={getActivityStatusColor(activity.status)}
                          />
                        </Box>
                      }
                      secondary={`${activity.device} • ${
                        activity.location
                      } • ${new Date(activity.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommandations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommandations de sécurité
              </Typography>
              <List>
                {!securityScore?.factors.twoFactor && (
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Activez l'authentification à deux facteurs"
                      secondary="Ajoutez une couche de sécurité supplémentaire à votre compte"
                    />
                    <Button variant="outlined" color="primary">
                      Activer
                    </Button>
                  </ListItem>
                )}
                {securityScore?.factors.passwordStrength < 70 && (
                  <ListItem>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Renforcez votre mot de passe"
                      secondary="Utilisez un mot de passe plus complexe pour améliorer la sécurité"
                    />
                    <Button variant="outlined" color="primary">
                      Modifier
                    </Button>
                  </ListItem>
                )}
                {securityScore?.factors.deviceTrust < 50 && (
                  <ListItem>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Gérez vos appareils de confiance"
                      secondary="Vérifiez et supprimez les appareils non reconnus"
                    />
                    <Button variant="outlined" color="primary">
                      Gérer
                    </Button>
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SecurityDashboard;
