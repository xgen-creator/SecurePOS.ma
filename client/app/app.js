import { webRTCService } from '../../services/webrtc.service';
import { awsService } from '../../services/aws.service';

class ScanBellApp {
    constructor() {
        this.initializeServices();
        this.setupEventListeners();
        this.setupWebRTC();
        this.setupMoodChart();
    }

    async initializeServices() {
        try {
            // Démarrage du flux vidéo
            const videoElement = document.getElementById('videoElement');
            const stream = await webRTCService.startLocalStream();
            videoElement.srcObject = stream;

            // Configuration des événements WebRTC
            webRTCService.on('remoteStream', (remoteStream) => {
                // Gestion du flux distant si nécessaire
                console.log('Flux distant reçu');
            });

            webRTCService.on('message', (message) => {
                this.handleIncomingMessage(message);
            });
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
        }
    }

    setupEventListeners() {
        // Boutons de contrôle
        document.querySelector('.control-button.primary').addEventListener('click', () => {
            this.toggleCamera();
        });

        document.querySelector('.control-button.success').addEventListener('click', () => {
            this.openDoor();
        });

        document.querySelector('.control-button.warning').addEventListener('click', () => {
            this.simulateDoorbell();
        });

        document.querySelector('.control-button.danger').addEventListener('click', () => {
            this.blockVisitor();
        });

        // Navigation mobile
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.currentTarget);
            });
        });
    }

    async setupWebRTC() {
        try {
            const offer = await webRTCService.createOffer();
            // Envoyer l'offre au serveur
            // Attendre la réponse et la gérer avec webRTCService.handleAnswer()
        } catch (error) {
            console.error('Erreur WebRTC:', error);
        }
    }

    setupMoodChart() {
        const ctx = document.getElementById('moodChart').getContext('2d');
        this.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['12:00', '13:00', '14:00', '15:00', '16:00'],
                datasets: [{
                    label: 'Niveau d\'humeur',
                    data: [75, 80, 65, 85, 90],
                    borderColor: '#3b82f6',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    async handleFaceDetection(imageData) {
        try {
            // Recherche du visage dans la collection AWS Rekognition
            const match = await awsService.searchFaceByImage(imageData);
            
            if (match) {
                const visitor = await awsService.getVisitor(match.Face.ExternalImageId);
                this.updateVisitorInfo(visitor);
                
                // Log de l'événement
                await awsService.logEvent({
                    visitorId: visitor.id,
                    eventType: 'FACE_DETECTED',
                    confidence: match.Similarity
                });
            } else {
                this.showNewVisitorModal(imageData);
            }
        } catch (error) {
            console.error('Erreur de détection:', error);
        }
    }

    async registerNewVisitor(imageData, visitorData) {
        try {
            // Upload de l'image vers S3
            const imageKey = await awsService.uploadVisitorImage(imageData, visitorData.id);
            
            // Indexation du visage
            const faceId = await awsService.indexFace(imageData, visitorData.id);
            
            // Sauvegarde des données du visiteur
            await awsService.saveVisitor({
                ...visitorData,
                faceId,
                imageKey
            });

            this.updateVisitorsList();
        } catch (error) {
            console.error('Erreur d\'enregistrement:', error);
        }
    }

    // Méthodes UI
    toggleCamera() {
        const videoElement = document.getElementById('videoElement');
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.enabled = !track.enabled);
        }
    }

    async openDoor() {
        try {
            await awsService.logEvent({
                eventType: 'DOOR_OPENED',
                timestamp: new Date().toISOString()
            });
            
            // Animation d'ouverture
            document.querySelector('.control-button.success').classList.add('active');
            setTimeout(() => {
                document.querySelector('.control-button.success').classList.remove('active');
            }, 2000);
        } catch (error) {
            console.error('Erreur d\'ouverture:', error);
        }
    }

    simulateDoorbell() {
        const doorbellOverlay = document.querySelector('.doorbell-overlay');
        doorbellOverlay.classList.add('active');
        
        // Son de sonnette
        const audio = new Audio('assets/doorbell-sound.mp3');
        audio.play();

        setTimeout(() => {
            doorbellOverlay.classList.remove('active');
        }, 3000);
    }

    async blockVisitor() {
        const currentVisitor = document.querySelector('.visitor-card').dataset.visitorId;
        if (currentVisitor) {
            try {
                await awsService.logEvent({
                    visitorId: currentVisitor,
                    eventType: 'VISITOR_BLOCKED'
                });
                
                this.updateVisitorsList();
            } catch (error) {
                console.error('Erreur de blocage:', error);
            }
        }
    }

    handleNavigation(navItem) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        // Changer de vue en fonction de la navigation
        const view = navItem.getAttribute('data-view');
        this.switchView(view);
    }

    switchView(view) {
        const mainContent = document.querySelector('.main-content');
        mainContent.dataset.currentView = view;
        
        // Animation de transition
        mainContent.style.opacity = '0';
        setTimeout(() => {
            // Changer le contenu
            this.loadViewContent(view);
            mainContent.style.opacity = '1';
        }, 300);
    }

    async loadViewContent(view) {
        const contentContainer = document.querySelector('.main-content');
        switch (view) {
            case 'home':
                // Vue principale déjà chargée
                break;
            case 'visitors':
                const visitors = await this.loadVisitors();
                this.renderVisitorsList(visitors);
                break;
            case 'stats':
                const stats = await this.loadStatistics();
                this.renderStatistics(stats);
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    // Méthodes auxiliaires
    updateVisitorInfo(visitor) {
        const visitorCard = document.querySelector('.visitor-card');
        visitorCard.dataset.visitorId = visitor.id;
        
        document.querySelector('.visitor-image img').src = visitor.imageUrl;
        document.querySelector('.visitor-info h3').textContent = visitor.name;
        document.querySelector('.visitor-info p').textContent = 
            `Dernière visite: ${new Date(visitor.lastVisit).toLocaleString()}`;
    }

    showNewVisitorModal(imageData) {
        const modal = document.getElementById('newVisitorModal');
        modal.style.display = 'flex';
        
        document.querySelector('.visitor-preview img').src = 
            URL.createObjectURL(new Blob([imageData], { type: 'image/jpeg' }));
    }

    async updateVisitorsList() {
        // Mise à jour de la liste des visiteurs
        const visitors = await this.loadVisitors();
        this.renderVisitorsList(visitors);
    }

    handleIncomingMessage(message) {
        switch (message.type) {
            case 'DOORBELL':
                this.simulateDoorbell();
                break;
            case 'FACE_DETECTED':
                this.handleFaceDetection(message.data);
                break;
            case 'SYSTEM_STATUS':
                this.updateSystemStatus(message.data);
                break;
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.scanBell = new ScanBellApp();
});
