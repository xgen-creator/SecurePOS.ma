const firebase = require('firebase-admin');
const notificationService = require('./notification-service');
const { generateQRCode } = require('../utils/qr-generator');

class DeliveryService {
    constructor() {
        this.db = firebase.firestore();
        this.deliveryZones = new Map();
    }

    async createDeliveryRequest(userId, details) {
        try {
            const accessCode = this.generateAccessCode();
            const qrCode = await generateQRCode(accessCode);

            const delivery = {
                userId,
                status: 'pending',
                accessCode,
                qrCode,
                details,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                instructions: details.instructions || '',
                dropZone: details.dropZone || 'default',
                tracking: {
                    events: [{
                        type: 'created',
                        timestamp: new Date(),
                        details: 'Demande de livraison créée'
                    }]
                }
            };

            const docRef = await this.db.collection('deliveries').add(delivery);
            
            // Notifier l'utilisateur
            await notificationService.sendNotification(userId, {
                type: 'deliveries',
                title: 'Nouvelle livraison programmée',
                body: `Code d'accès: ${accessCode}`,
                priority: 'normal',
                data: {
                    deliveryId: docRef.id,
                    accessCode
                }
            });

            return {
                deliveryId: docRef.id,
                accessCode,
                qrCode
            };
        } catch (error) {
            console.error('Erreur création livraison:', error);
            throw error;
        }
    }

    async validateDeliveryAccess(accessCode, carrierId) {
        try {
            const snapshot = await this.db.collection('deliveries')
                .where('accessCode', '==', accessCode)
                .where('status', '==', 'pending')
                .get();

            if (snapshot.empty) {
                return { valid: false, reason: 'Code invalide ou expiré' };
            }

            const delivery = snapshot.docs[0].data();
            const deliveryId = snapshot.docs[0].id;

            // Vérifier si le livreur est autorisé
            if (delivery.details.restrictedCarriers && 
                !delivery.details.restrictedCarriers.includes(carrierId)) {
                return { valid: false, reason: 'Transporteur non autorisé' };
            }

            return { 
                valid: true, 
                delivery: {
                    id: deliveryId,
                    dropZone: delivery.dropZone,
                    instructions: delivery.instructions
                }
            };
        } catch (error) {
            console.error('Erreur validation accès:', error);
            throw error;
        }
    }

    async updateDeliveryStatus(deliveryId, status, details = {}) {
        try {
            const deliveryRef = this.db.collection('deliveries').doc(deliveryId);
            const delivery = (await deliveryRef.get()).data();

            const update = {
                status,
                'tracking.events': firebase.firestore.FieldValue.arrayUnion({
                    type: status,
                    timestamp: new Date(),
                    details: details.message || '',
                    location: details.location,
                    photo: details.photo
                })
            };

            await deliveryRef.update(update);

            // Notifier l'utilisateur
            if (delivery) {
                const notifications = {
                    delivered: {
                        title: 'Colis livré',
                        body: 'Votre colis a été livré avec succès',
                        priority: 'high'
                    },
                    failed: {
                        title: 'Échec de livraison',
                        body: details.message || 'La livraison a échoué',
                        priority: 'high'
                    }
                };

                if (notifications[status]) {
                    await notificationService.sendNotification(delivery.userId, {
                        type: 'deliveries',
                        ...notifications[status],
                        data: {
                            deliveryId,
                            status,
                            photo: details.photo
                        }
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur mise à jour livraison:', error);
            throw error;
        }
    }

    async getDeliveryHistory(userId, options = {}) {
        try {
            let query = this.db.collection('deliveries')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc');

            if (options.status) {
                query = query.where('status', '==', options.status);
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur récupération historique:', error);
            throw error;
        }
    }

    async configureDropZone(userId, zoneConfig) {
        try {
            await this.db.collection('dropZones').doc(userId).set({
                config: zoneConfig,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Mettre à jour le cache local
            this.deliveryZones.set(userId, zoneConfig);
            
            return true;
        } catch (error) {
            console.error('Erreur configuration zone:', error);
            throw error;
        }
    }

    async getDropZoneConfig(userId) {
        // Vérifier le cache d'abord
        if (this.deliveryZones.has(userId)) {
            return this.deliveryZones.get(userId);
        }

        try {
            const doc = await this.db.collection('dropZones').doc(userId).get();
            const config = doc.exists ? doc.data().config : this.getDefaultZoneConfig();
            
            // Mettre en cache
            this.deliveryZones.set(userId, config);
            
            return config;
        } catch (error) {
            console.error('Erreur récupération config zone:', error);
            throw error;
        }
    }

    generateAccessCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    getDefaultZoneConfig() {
        return {
            location: 'Devant la porte',
            instructions: 'Laisser le colis dans un endroit sec et à l'abri',
            photo_required: true,
            signature_required: false,
            allowed_hours: {
                start: '08:00',
                end: '20:00'
            }
        };
    }
}

module.exports = new DeliveryService();
