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
                // Geolocation anti-fraud check
                const position = await this.getCurrentPositionWithTimeout(5000);
                
                let url = `/api/tags/scan/${tagData}`;
                
                // Add geolocation coordinates if available
                if (position) {
                    const { latitude, longitude } = position.coords;
                    url += `?lat=${latitude}&lng=${longitude}`;
                }
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    
                    // Handle geofencing violation
                    if (response.status === 403 && errorData.error === 'Geofencing violation') {
                        alert(`⚠️ ${errorData.message}\n\nDistance détectée: ${errorData.distance}m (max: ${errorData.maxDistance}m)\n\nVous devez être physiquement devant la porte pour utiliser ce tag.`);
                        return;
                    }
                    
                    // Handle geolocation required
                    if (response.status === 403 && errorData.error === 'Geolocation required') {
                        alert(`📍 ${errorData.message}\n\nVeuillez autoriser la géolocalisation dans les paramètres de votre navigateur.`);
                        return;
                    }
                    
                    throw new Error('Tag invalide');
                }
                
                this.ownerInfo = await response.json();
                this.currentStep = 'contact';
            } catch (error) {
                console.error('Erreur tag:', error);
                
                if (error.message === 'Geolocation timeout') {
                    alert('⏱️ Délai de géolocalisation dépassé.\nVeuillez vérifier que votre GPS est activé et réessayez.');
                } else if (error.message === 'Geolocation denied') {
                    alert('📍 Géolocalisation refusée.\nCe tag nécessite votre position pour vérifier que vous êtes sur place.\nVeuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.');
                } else {
                    alert('Tag invalide ou expiré');
                }
            }
        },

        /**
         * Get current position with timeout
         * @param timeoutMs Timeout in milliseconds
         * @returns Promise<GeolocationPosition | null>
         */
        getCurrentPositionWithTimeout(timeoutMs) {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    console.warn('Geolocation not supported');
                    resolve(null); // Continue without geolocation (will be handled by server)
                    return;
                }

                const timeoutId = setTimeout(() => {
                    reject(new Error('Geolocation timeout'));
                }, timeoutMs);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(timeoutId);
                        resolve(position);
                    },
                    (error) => {
                        clearTimeout(timeoutId);
                        console.error('Geolocation error:', error);
                        
                        if (error.code === error.PERMISSION_DENIED) {
                            reject(new Error('Geolocation denied'));
                        } else if (error.code === error.TIMEOUT) {
                            reject(new Error('Geolocation timeout'));
                        } else {
                            // POSITION_UNAVAILABLE - try to continue without location
                            resolve(null);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: timeoutMs,
                        maximumAge: 30000 // Accept positions up to 30 seconds old
                    }
                );
            });
        },

        async initiateCommunication(type) {
            this.communicationType = type;
            
            // WhatsApp Anonyme - Redirection directe via proxy (PREMIUM only)
            if (type === 'whatsapp') {
                this.openWhatsAppProxy();
                return;
            }
            
            // DIY Tier: Messagerie asynchrone (texte + audio)
            // Seule option disponible pour les tags DIY
            if (type === 'message' && this.ownerInfo.isDIY) {
                this.currentStep = 'diy-message';
                this.initDIYMessage();
                return;
            }
            
            try {
                // Demande de session (PREMIUM tier only)
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
         * Initialize DIY message interface (Tier DIY "Maroc Lite")
         * Permet envoi de message texte et note vocale (async)
         */
        initDIYMessage() {
            this.diyMessage = {
                text: '',
                audioBlob: null,
                audioDuration: 0,
                isRecording: false,
                mediaRecorder: null,
                audioChunks: []
            };
        },

        /**
         * Start audio recording using MediaRecorder
         * Max duration: 30 seconds
         */
        async startDIYAudioRecording() {
            try {
                if (!navigator.mediaDevices || !window.MediaRecorder) {
                    alert('Votre navigateur ne supporte pas l\'enregistrement audio.');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Use webm with opus codec for best compression
                const options = { mimeType: 'audio/webm;codecs=opus' };
                const mediaRecorder = new MediaRecorder(stream, options);
                
                this.diyMessage.audioChunks = [];
                this.diyMessage.isRecording = true;
                this.diyMessage.mediaRecorder = mediaRecorder;
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.diyMessage.audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.diyMessage.audioChunks, { type: 'audio/webm' });
                    this.diyMessage.audioBlob = audioBlob;
                    this.diyMessage.isRecording = false;
                    
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                    
                    console.log('Audio recorded:', audioBlob.size, 'bytes');
                };
                
                // Start recording
                mediaRecorder.start(100); // Collect data every 100ms
                
                // Auto-stop after 30 seconds (max duration)
                this.diyRecordingTimeout = setTimeout(() => {
                    if (this.diyMessage.isRecording) {
                        this.stopDIYAudioRecording();
                        alert('Enregistrement arrêté automatiquement (30 secondes maximum)');
                    }
                }, 30000);
                
            } catch (error) {
                console.error('Erreur enregistrement audio:', error);
                if (error.name === 'NotAllowedError') {
                    alert('Permission microphone refusée. Veuillez autoriser l\'accès au microphone.');
                } else {
                    alert('Erreur lors de l\'enregistrement audio: ' + error.message);
                }
            }
        },

        /**
         * Stop audio recording
         */
        stopDIYAudioRecording() {
            if (this.diyMessage.mediaRecorder && this.diyMessage.isRecording) {
                this.diyMessage.mediaRecorder.stop();
            }
            if (this.diyRecordingTimeout) {
                clearTimeout(this.diyRecordingTimeout);
                this.diyRecordingTimeout = null;
            }
        },

        /**
         * Cancel/delete recorded audio
         */
        cancelDIYAudio() {
            this.diyMessage.audioBlob = null;
            this.diyMessage.audioChunks = [];
            this.diyMessage.audioDuration = 0;
        },

        /**
         * Play recorded audio preview
         */
        playDIYAudioPreview() {
            if (!this.diyMessage.audioBlob) return;
            
            const audioUrl = URL.createObjectURL(this.diyMessage.audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        },

        /**
         * Send DIY message (text + optional audio) to server
         */
        async sendDIYMessage() {
            try {
                const { text, audioBlob } = this.diyMessage;
                
                if (!text && !audioBlob) {
                    alert('Veuillez écrire un message ou enregistrer un audio.');
                    return;
                }
                
                // Prepare request data
                const requestData = {
                    tagId: this.ownerInfo.tagId,
                    tagCode: this.ownerInfo.tagCode,
                    text: text || null,
                    duration: this.diyMessage.audioDuration || null
                };
                
                // Convert audio to base64 if present
                if (audioBlob) {
                    const reader = new FileReader();
                    const audioBase64 = await new Promise((resolve) => {
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(audioBlob);
                    });
                    requestData.audioBase64 = audioBase64;
                }
                
                // Send to API
                const response = await fetch('/api/messages/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erreur d\'envoi');
                }
                
                const result = await response.json();
                
                // Show success message
                alert('✅ Message envoyé avec succès ! Le propriétaire recevra une notification.');
                
                // Reset form
                this.initDIYMessage();
                this.currentStep = 'success';
                
            } catch (error) {
                console.error('Erreur envoi message:', error);
                alert('❌ Erreur lors de l\'envoi: ' + error.message);
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
