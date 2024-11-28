const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const notificationService = require('../services/real-time-notification-service');

// Middleware d'authentification pour toutes les routes
router.use(verifyToken);

// Récupérer toutes les notifications d'un utilisateur avec pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await notificationService.getNotificationHistory(req.user.id, page, limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
});

// Récupérer les notifications non lues
router.get('/unread', async (req, res) => {
    try {
        const notifications = await notificationService.getUnreadNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notifications non lues' });
    }
});

// Marquer une notification comme lue
router.post('/:notificationId/read', async (req, res) => {
    try {
        await notificationService.markAsRead(req.user.id, req.params.notificationId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Erreur lors du marquage de la notification comme lue' });
    }
});

// Marquer toutes les notifications comme lues
router.post('/read-all', async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Erreur lors du marquage des notifications comme lues' });
    }
});

// Supprimer une notification
router.delete('/:notificationId', async (req, res) => {
    try {
        await notificationService.deleteNotification(req.user.id, req.params.notificationId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de la notification' });
    }
});

// Supprimer toutes les notifications lues
router.delete('/read', async (req, res) => {
    try {
        const notifications = await notificationService.getNotificationHistory(req.user.id);
        const readNotifications = notifications.notifications.filter(n => n.read);
        
        await Promise.all(
            readNotifications.map(n => 
                notificationService.deleteNotification(req.user.id, n.id)
            )
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting read notifications:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression des notifications lues' });
    }
});

module.exports = router;
