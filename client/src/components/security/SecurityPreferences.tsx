import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Security,
  Phonelink,
  LocationOn,
  NotificationsActive,
  Delete,
  Info,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import TwoFactorSetup from './TwoFactorSetup';

interface SecurityPreference {
  twoFactorEnabled: boolean;
  deviceTrustEnabled: boolean;
  locationTrackingEnabled: boolean;
  securityAlertsEnabled: boolean;
}

interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: string;
  browser: string;
  os: string;
}

const SecurityPreferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SecurityPreference>({
    twoFactorEnabled: false,
    deviceTrustEnabled: false,
    locationTrackingEnabled: false,
    securityAlertsEnabled: true,
  });
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadSecurityPreferences();
    loadTrustedDevices();
  }, []);

  const loadSecurityPreferences = async () => {
    try {
      const response = await axios.get('/api/security/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    }
  };

  const loadTrustedDevices = async () => {
    try {
      const response = await axios.get('/api/security/devices');
      setTrustedDevices(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des appareils:', error);
    }
  };

  const handlePreferenceChange = async (key: keyof SecurityPreference) => {
    if (key === 'twoFactorEnabled' && !preferences[key]) {
      setShow2FASetup(true);
      return;
    }

    try {
      setLoading(true);
      await axios.put('/api/security/preferences', {
        [key]: !preferences[key],
      });
      setPreferences((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceRemoval = async (deviceId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer l\'appareil de confiance',
      message: 'Êtes-vous sûr de vouloir supprimer cet appareil ? Vous devrez vous reconnecter sur cet appareil.',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/security/devices/${deviceId}`);
          setTrustedDevices((prev) =>
            prev.filter((device) => device.id !== deviceId)
          );
        } catch (error) {
          console.error('Erreur lors de la suppression de l\'appareil:', error);
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <Security sx={{ mr: 1, verticalAlign: 'bottom' }} />
        Préférences de sécurité
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Authentification et Sécurité
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Double authentification"
                    secondary="Ajoutez une couche de sécurité supplémentaire à votre compte"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={preferences.twoFactorEnabled}
                      onChange={() => handlePreferenceChange('twoFactorEnabled')}
                      disabled={loading}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Phonelink />
                  </ListItemIcon>
                  <ListItemText
                    primary="Appareils de confiance"
                    secondary="Mémoriser les appareils sur lesquels vous vous connectez fréquemment"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={preferences.deviceTrustEnabled}
                      onChange={() => handlePreferenceChange('deviceTrustEnabled')}
                      disabled={loading}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText
                    primary="Suivi de localisation"
                    secondary="Détecter les connexions depuis des emplacements inhabituels"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={preferences.locationTrackingEnabled}
                      onChange={() =>
                        handlePreferenceChange('locationTrackingEnabled')
                      }
                      disabled={loading}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <NotificationsActive />
                  </ListItemIcon>
                  <ListItemText
                    primary="Alertes de sécurité"
                    secondary="Recevoir des notifications en cas d'activité suspecte"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={preferences.securityAlertsEnabled}
                      onChange={() =>
                        handlePreferenceChange('securityAlertsEnabled')
                      }
                      disabled={loading}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appareils de confiance
              </Typography>
              <List>
                {trustedDevices.map((device) => (
                  <React.Fragment key={device.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Phonelink />
                      </ListItemIcon>
                      <ListItemText
                        primary={device.name}
                        secondary={`${device.browser} sur ${
                          device.os
                        } • Dernière utilisation : ${new Date(
                          device.lastUsed
                        ).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeviceRemoval(device.id)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
                {trustedDevices.length === 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <Info />
                    </ListItemIcon>
                    <ListItemText
                      primary="Aucun appareil de confiance"
                      secondary="Les appareils de confiance apparaîtront ici"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {show2FASetup && (
        <TwoFactorSetup onClose={() => setShow2FASetup(false)} />
      )}

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>{confirmDialog.message}</DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
          >
            Annuler
          </Button>
          <Button
            onClick={() => confirmDialog.onConfirm()}
            color="error"
            variant="contained"
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityPreferences;
