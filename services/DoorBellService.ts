import { EventEmitter } from 'events';
import { logger } from './utils/logger';
import { Face } from '../models/FaceModel';
import { NotificationService } from './NotificationService';
import { LoggingService } from './LoggingService';
import { ExpressionAnalysisService } from './ExpressionAnalysisService';
import { SceneAutomationService } from './SceneAutomationService';

/**
 * Service de gestion de la sonnette
 * @singleton Gère les événements de sonnette et l'automatisation associée
 * @emits doorbell-ring
 */
export class DoorBellService {
    private static instance: DoorBellService;
    private static isDestroyed = false;
    private eventEmitter: EventEmitter;
    private notificationService: NotificationService;
    private loggingService: LoggingService;
    private expressionService: ExpressionAnalysisService;
    private sceneService: SceneAutomationService;
    private boundListeners: Map<string, (...args: any[]) => void>;

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.notificationService = NotificationService.getInstance();
        this.loggingService = LoggingService.getInstance();
        this.expressionService = ExpressionAnalysisService.getInstance();
        this.sceneService = SceneAutomationService.getInstance();
        this.boundListeners = new Map();

        // Écouter les événements de sonnette
        this.initializeListeners();
        DoorBellService.isDestroyed = false;
    }

    public static getInstance(): DoorBellService {
        if (!DoorBellService.instance || DoorBellService.isDestroyed) {
            DoorBellService.instance = new DoorBellService();
        }
        return DoorBellService.instance;
    }

    /**
     * Destroys the service instance and cleans up all resources
     * Removes event listeners and clears the singleton
     */
    public static destroy(): void {
        if (DoorBellService.isDestroyed) {
            logger.warn('DoorBellService already destroyed');
            return;
        }

        const instance = DoorBellService.instance;
        if (instance) {
            // Remove all bound listeners
            instance.boundListeners.forEach((listener, event) => {
                instance.eventEmitter.removeListener(event, listener);
                logger.debug(`Removed listener for event: ${event}`);
            });
            instance.boundListeners.clear();

            // Remove all listeners from eventEmitter
            instance.eventEmitter.removeAllListeners();

            logger.info('DoorBellService destroyed successfully');
        }

        DoorBellService.isDestroyed = true;
        DoorBellService.instance = null as any;
    }

    private initializeListeners(): void {
        const doorbellHandler = this.handleDoorbellRing.bind(this);
        this.eventEmitter.on('doorbell-ring', doorbellHandler);
        this.boundListeners.set('doorbell-ring', doorbellHandler);
    }

    // Gérer un nouvel événement de sonnette
    public async handleDoorbellRing(visitorData: any) {
        try {
            const { faceImage, timestamp } = visitorData;
            
            // Enregistrer l'événement
            this.loggingService.info('Nouvelle sonnette détectée', { timestamp });

            // Analyser le visage du visiteur
            const visitorInfo = await this.analyzeVisitor(faceImage);

            // Créer la notification appropriée
            const notification = this.createVisitorNotification(visitorInfo);

            // Envoyer la notification
            await this.notificationService.send(notification);

            // Déclencher l'automatisation appropriée
            await this.handleAutomation(visitorInfo);

            return {
                success: true,
                visitorInfo,
                notification
            };
        } catch (error) {
            this.loggingService.error('Erreur lors du traitement de la sonnette', error);
            throw error;
        }
    }

    // Analyser un visiteur
    private async analyzeVisitor(faceImage: any) {
        try {
            // Vérifier si le visiteur est connu
            const knownFace = await Face.findByDescriptor(faceImage.descriptor);

            // Analyser l'expression du visiteur
            const expression = await this.expressionService.analyzeExpression(faceImage);

            return {
                isKnown: !!knownFace,
                visitor: knownFace || null,
                expression,
                timestamp: new Date(),
                image: faceImage
            };
        } catch (error) {
            this.loggingService.error('Erreur lors de l\'analyse du visiteur', error);
            throw error;
        }
    }

    // Créer une notification adaptée au visiteur
    private createVisitorNotification(visitorInfo: any) {
        const { isKnown, visitor, expression, timestamp } = visitorInfo;

        if (isKnown) {
            return {
                type: 'KNOWN_VISITOR',
                title: `${visitor.name} est à la porte`,
                message: `Expression détectée: ${expression.dominant}`,
                priority: 'high',
                data: {
                    visitorId: visitor._id,
                    timestamp,
                    expression
                }
            };
        } else {
            return {
                type: 'UNKNOWN_VISITOR',
                title: 'Nouveau visiteur détecté',
                message: 'Un visiteur inconnu est à la porte',
                priority: 'high',
                data: {
                    timestamp,
                    expression
                }
            };
        }
    }

    // Gérer l'automatisation en fonction du visiteur
    private async handleAutomation(visitorInfo: any) {
        const { isKnown, visitor, expression } = visitorInfo;

        // Règles d'automatisation par défaut
        const automationRules = {
            KNOWN_VISITOR: {
                priority: 'high',
                actions: [
                    {
                        type: 'LIGHT',
                        action: 'WELCOME_SEQUENCE'
                    },
                    {
                        type: 'DOOR',
                        action: visitor?.autoUnlock ? 'UNLOCK' : 'STAY_LOCKED'
                    }
                ]
            },
            UNKNOWN_VISITOR: {
                priority: 'medium',
                actions: [
                    {
                        type: 'LIGHT',
                        action: 'ALERT_SEQUENCE'
                    },
                    {
                        type: 'CAMERA',
                        action: 'RECORD'
                    }
                ]
            }
        };

        // Exécuter les actions d'automatisation
        const ruleType = isKnown ? 'KNOWN_VISITOR' : 'UNKNOWN_VISITOR';
        await this.sceneService.executeRules(automationRules[ruleType], {
            visitor,
            expression,
            timestamp: new Date()
        });
    }

    // Simuler une sonnette (pour les tests)
    public async simulateDoorbellRing(faceImage: any) {
        this.eventEmitter.emit('doorbell-ring', {
            faceImage,
            timestamp: new Date()
        });
    }

    // Obtenir l'historique des sonnettes
    public async getDoorbellHistory(filters: any = {}) {
        try {
            // Implémenter la logique de récupération de l'historique
            const history = await Face.aggregate([
                {
                    $match: {
                        type: 'DOORBELL_EVENT',
                        ...filters
                    }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $limit: 100
                }
            ]);

            return history;
        } catch (error) {
            this.loggingService.error('Erreur lors de la récupération de l\'historique', error);
            throw error;
        }
    }
}
