import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { SecurityOutlined, QrCode2, PhoneAndroid, Email } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface BackupCodesDialogProps {
  open: boolean;
  codes: string[];
  onClose: () => void;
}

const BackupCodesDialog: React.FC<BackupCodesDialogProps> = ({ open, codes, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Vos codes de secours</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois.
      </Typography>
      <Grid container spacing={1}>
        {codes.map((code, index) => (
          <Grid item xs={6} key={index}>
            <Typography
              variant="mono"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
              }}
            >
              {code}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">
        J'ai sauvegardé mes codes
      </Button>
    </DialogActions>
  </Dialog>
);

const TwoFactorSetup: React.FC = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [method, setMethod] = useState<'2fa_totp' | '2fa_sms' | '2fa_email'>('2fa_totp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const steps = ['Choisir la méthode', 'Configuration', 'Vérification'];

  useEffect(() => {
    if (activeStep === 1 && method) {
      initializeMethod();
    }
  }, [activeStep, method]);

  const initializeMethod = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/security/2fa/init', { method });
      
      if (method === '2fa_totp') {
        setQrCode(response.data.qrCodeUrl);
        setSecret(response.data.secret);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Erreur lors de l\'initialisation de la 2FA');
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/security/2fa/verify', {
        method,
        code: verificationCode,
        secret: method === '2fa_totp' ? secret : undefined,
      });

      if (response.data.success) {
        setBackupCodes(response.data.backupCodes);
        setShowBackupCodes(true);
      }

      setLoading(false);
    } catch (err) {
      setError('Code de vérification invalide');
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card
          onClick={() => setMethod('2fa_totp')}
          sx={{
            cursor: 'pointer',
            bgcolor: method === '2fa_totp' ? 'primary.light' : 'background.paper',
            p: 2,
          }}
        >
          <CardContent>
            <QrCode2 sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Application d'authentification</Typography>
            <Typography variant="body2" color="text.secondary">
              Utilisez Google Authenticator ou une application similaire
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card
          onClick={() => setMethod('2fa_sms')}
          sx={{
            cursor: 'pointer',
            bgcolor: method === '2fa_sms' ? 'primary.light' : 'background.paper',
            p: 2,
          }}
        >
          <CardContent>
            <PhoneAndroid sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">SMS</Typography>
            <Typography variant="body2" color="text.secondary">
              Recevez un code par SMS sur votre téléphone
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card
          onClick={() => setMethod('2fa_email')}
          sx={{
            cursor: 'pointer',
            bgcolor: method === '2fa_email' ? 'primary.light' : 'background.paper',
            p: 2,
          }}
        >
          <CardContent>
            <Email sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Email</Typography>
            <Typography variant="body2" color="text.secondary">
              Recevez un code par email
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderConfiguration = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    switch (method) {
      case '2fa_totp':
        return (
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              Scannez le QR code
            </Typography>
            {qrCode && (
              <Box
                component="img"
                src={qrCode}
                alt="QR Code"
                sx={{ width: 200, height: 200, mb: 2 }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              Scannez ce QR code avec votre application d'authentification
            </Typography>
          </Box>
        );
      
      case '2fa_sms':
        return (
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              Vérification par SMS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Un code a été envoyé à votre numéro de téléphone
            </Typography>
          </Box>
        );
      
      case '2fa_email':
        return (
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              Vérification par Email
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Un code a été envoyé à votre adresse email
            </Typography>
          </Box>
        );
    }
  };

  const renderVerification = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Entrez le code de vérification
      </Typography>
      <TextField
        fullWidth
        label="Code de vérification"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        sx={{ mb: 2 }}
      />
      <LoadingButton
        variant="contained"
        fullWidth
        loading={loading}
        onClick={handleVerification}
        disabled={verificationCode.length < 6}
      >
        Vérifier
      </LoadingButton>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <SecurityOutlined sx={{ mr: 1, verticalAlign: 'bottom' }} />
        Configuration de la double authentification
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 2, mb: 4 }}>
        {activeStep === 0 && renderMethodSelection()}
        {activeStep === 1 && renderConfiguration()}
        {activeStep === 2 && renderVerification()}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={() => setActiveStep((prev) => prev - 1)}
        >
          Retour
        </Button>
        <Button
          variant="contained"
          disabled={loading || activeStep === 2}
          onClick={() => setActiveStep((prev) => prev + 1)}
        >
          Suivant
        </Button>
      </Box>

      <BackupCodesDialog
        open={showBackupCodes}
        codes={backupCodes}
        onClose={() => setShowBackupCodes(false)}
      />
    </Box>
  );
};

export default TwoFactorSetup;
