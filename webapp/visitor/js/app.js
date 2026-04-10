const app = Vue.createApp({
    data() {
        return {
            currentStep: 'scan', // 'scan', 'contact', 'communication'
            connectionStatus: '',
            communicationType: null,
            ownerInfo: null,
            sessionId: null,
            messages: [],
            newMessage: '',
            peerConnection: null,
            dataChannel: null,
            localStream: null,
            remoteStream: null,
            scanner: null
        }
    },

    methods: {
        async startScanner() {
            try {
                if (!this.scanner) {
                    const videoElement = document.createElement('video');
                    document.getElementById('scanner-container').appendChild(videoElement);
                    
                    this.scanner = new QrScanner(
                        videoElement,
                        result => this.handleScan(result),
                        {
                            highlightScanRegion: true,
                            highlightCodeOutline: true,
                        }
                    );
                }
                await this.scanner.start();
            } catch (error) {
                console.error('Erreur scanner:', error);
                alert('Erreur d\'accès à la caméra');
            }
        },

        async checkNFC() {
            if ('NDEFReader' in window) {
                try {
                    const ndef = new NDEFReader();
                    await ndef.scan();
                    
                    ndef.addEventListener("reading", ({ message, serialNumber }) => {
                        this.handleNFC(message);
                    });
                } catch (error) {
                    console.error('Erreur NFC:', error);
                    alert('Erreur d\'accès NFC');
                }
            } else {
                alert('NFC non supporté sur cet appareil');
            }
        },

        async handleScan(result) {
            this.scanner?.stop();
            await this.processTag(result);
        },

        async handleNFC(message) {
            const decoder = new TextDecoder();
            for (const record of message.records) {
                if (record.recordType === "url") {
                    const url = decoder.decode(record.data);
                    await this.processTag(url);
                    break;
                }
            }
        },

        async processTag(tagData) {
            try {
                const response = await fetch(`/api/tags/scan/${tagData}`);
                if (!response.ok) throw new Error('Tag invalide');
                
                this.ownerInfo = await response.json();
                this.currentStep = 'contact';
            } catch (error) {
                console.error('Erreur tag:', error);
                alert('Tag invalide ou expiré');
            }
        },

        async initiateCommunication(type) {
            this.communicationType = type;
            
            // WhatsApp Anonyme - Redirection directe via proxy
            if (type === 'whatsapp') {
                this.openWhatsAppProxy();
                return;
            }
            
            try {
                // Demande de session
                const response = await fetch('/api/communication/request/' + this.ownerInfo.tagId, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type })
                });
                
                if (!response.ok) throw new Error('Erreur de communication');
                const { sessionId } = await response.json();
                this.sessionId = sessionId;

                // Configuration WebRTC si nécessaire
                if (type === 'video' || type === 'audio') {
                    await this.setupWebRTC(type);
                }

                this.currentStep = 'communication';
                this.startSessionCheck();
            } catch (error) {
                console.error('Erreur communication:', error);
                alert('Erreur de communication');
            }
        },

        /**
         * Ouvre WhatsApp avec le numéro proxy (anonyme)
         * Le visiteur ne voit jamais le numéro réel du propriétaire
         */
        openWhatsAppProxy() {
            // Récupérer le numéro proxy depuis les variables d'environnement
            // En production, cela devrait être configuré côté serveur
            const proxyNumber = window.WHATSAPP_PROXY_NUMBER || '212600000000'; // Format international sans +
            const tagCode = this.ownerInfo.tagCode;
            const ownerName = this.ownerInfo.owner.name;
            
            const message = encodeURIComponent(
                `Bonjour, je souhaite contacter le propriétaire du tag ${tagCode} (${ownerName}). Je suis un visiteur.`
            );
            
            const whatsappUrl = `https://wa.me/${proxyNumber}?text=${message}`;
            
            // Journaliser la tentative de contact
            this.logWhatsAppAttempt(tagCode);
            
            // Ouvrir WhatsApp
            window.open(whatsappUrl, '_blank');
        },

        /**
         * Journalise la tentative de contact WhatsApp
         */
        async logWhatsAppAttempt(tagCode) {
            try {
                await fetch('/api/access-log/whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tagCode: tagCode,
                        method: 'WHATSAPP',
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (error) {
                console.error('Erreur journalisation WhatsApp:', error);
            }
        },

        async setupWebRTC(type) {
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            };

            this.peerConnection = new RTCPeerConnection(configuration);
            
            // Gestion des candidats ICE
            this.peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await fetch(`/api/communication/ice-candidate/${this.sessionId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(event.candidate)
                    });
                }
            };

            // Gestion du stream distant
            this.peerConnection.ontrack = (event) => {
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo.srcObject !== event.streams[0]) {
                    remoteVideo.srcObject = event.streams[0];
                    this.remoteStream = event.streams[0];
                }
            };

            // Configuration du stream local
            const constraints = {
                video: type === 'video',
                audio: true
            };

            try {
                this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
                const localVideo = document.getElementById('localVideo');
                localVideo.srcObject = this.localStream;
                
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            } catch (error) {
                console.error('Erreur média:', error);
                alert('Erreur d\'accès à la caméra/micro');
            }
        },

        async sendMessage() {
            if (!this.newMessage.trim()) return;

            try {
                await fetch(`/api/communication/message/${this.sessionId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: this.newMessage })
                });

                this.messages.push({
                    id: Date.now(),
                    content: this.newMessage,
                    sender: 'visitor'
                });
                
                this.newMessage = '';
            } catch (error) {
                console.error('Erreur message:', error);
                alert('Erreur d\'envoi du message');
            }
        },

        startSessionCheck() {
            this.sessionCheckInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/communication/status/${this.sessionId}`);
                    const { status } = await response.json();
                    
                    if (status === 'ended') {
                        this.endCommunication();
                    } else if (status === 'rejected') {
                        alert('Communication refusée');
                        this.endCommunication();
                    }
                } catch (error) {
                    console.error('Erreur vérification session:', error);
                }
            }, 5000);
        },

        async endCommunication() {
            clearInterval(this.sessionCheckInterval);
            
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            if (this.peerConnection) {
                this.peerConnection.close();
            }

            try {
                await fetch(`/api/communication/end/${this.sessionId}`, { method: 'POST' });
            } catch (error) {
                console.error('Erreur fin communication:', error);
            }

            this.currentStep = 'scan';
            this.communicationType = null;
            this.sessionId = null;
            this.messages = [];
        }
    },

    beforeUnmount() {
        this.scanner?.stop();
        clearInterval(this.sessionCheckInterval);
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
    }
});

app.mount('#app');
