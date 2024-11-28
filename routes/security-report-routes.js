const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const securityReportService = require('../services/security-report-service');
const { logSecurity } = require('../services/logging-service');

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// Générer un nouveau rapport de sécurité
router.post('/report', async (req, res) => {
    try {
        const report = await securityReportService.generateSecurityReport(req.user.id);
        
        logSecurity(req.user.id, 'security_report_generated', 'info', {
            reportId: report.id,
            securityScore: report.securityScore
        });

        res.json(report);
    } catch (error) {
        console.error('Error generating security report:', error);
        res.status(500).json({
            error: 'Erreur lors de la génération du rapport de sécurité'
        });
    }
});

// Récupérer le dernier rapport de sécurité
router.get('/report/latest', async (req, res) => {
    try {
        const report = await securityReportService.getLatestReport(req.user.id);
        if (!report) {
            return res.status(404).json({
                error: 'Aucun rapport disponible'
            });
        }
        res.json(report);
    } catch (error) {
        console.error('Error fetching latest security report:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du rapport de sécurité'
        });
    }
});

// Récupérer l'historique des rapports
router.get('/report/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const reports = await securityReportService.getReportHistory(
            req.user.id,
            page,
            limit
        );
        
        res.json(reports);
    } catch (error) {
        console.error('Error fetching security report history:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération de l\'historique des rapports'
        });
    }
});

// Récupérer un rapport spécifique
router.get('/report/:reportId', async (req, res) => {
    try {
        const report = await securityReportService.getReport(
            req.user.id,
            req.params.reportId
        );
        
        if (!report) {
            return res.status(404).json({
                error: 'Rapport non trouvé'
            });
        }
        
        res.json(report);
    } catch (error) {
        console.error('Error fetching security report:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du rapport'
        });
    }
});

// Appliquer une recommandation de sécurité
router.post('/report/recommendation/:recommendationId/apply', async (req, res) => {
    try {
        const result = await securityReportService.applyRecommendation(
            req.user.id,
            req.params.recommendationId
        );
        
        logSecurity(req.user.id, 'security_recommendation_applied', 'info', {
            recommendationId: req.params.recommendationId,
            result
        });

        res.json(result);
    } catch (error) {
        console.error('Error applying security recommendation:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'application de la recommandation'
        });
    }
});

// Exporter le rapport au format PDF
router.get('/report/:reportId/export', async (req, res) => {
    try {
        const pdfBuffer = await securityReportService.exportReportToPDF(
            req.user.id,
            req.params.reportId
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=security-report-${req.params.reportId}.pdf`);
        res.send(pdfBuffer);
        
        logSecurity(req.user.id, 'security_report_exported', 'info', {
            reportId: req.params.reportId,
            format: 'pdf'
        });
    } catch (error) {
        console.error('Error exporting security report:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'exportation du rapport'
        });
    }
});

module.exports = router;
