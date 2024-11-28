const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { verifyToken, require2FA } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');
const sessionRoutes = require('./routes/session-routes');

const app = express();

// Middleware de base
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware personnalisé pour la gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Une erreur est survenue'
    });
});

// Routes publiques
app.use('/auth', authRoutes);

// Routes protégées
app.use('/api', verifyToken); // Protection globale avec JWT
app.use('/api/security', securityRoutes);
app.use('/api/security', sessionRoutes); // Routes de gestion des sessions

// Route protégée par 2FA
app.use('/api/protected', require2FA, (req, res) => {
    res.json({ message: 'Accès autorisé' });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

module.exports = app;
