import { DetectedFace } from './FaceRecognitionService';
import { eventService } from './EventService';
import { loggingService } from './LoggingService';
import { notificationService } from './NotificationService';

export interface ExpressionAnalysis {
  dominantEmotion: string;
  emotionConfidence: number;
  emotionDistribution: {
    [key: string]: number;
  };
  timestamp: Date;
  personName: string;
}

export interface MoodPrediction {
  currentMood: string;
  confidence: number;
  previousMoods: string[];
  moodTrend: 'improving' | 'declining' | 'stable';
  suggestedActions?: string[];
}

class ExpressionAnalysisService {
  private static instance: ExpressionAnalysisService;
  private expressionHistory: Map<string, ExpressionAnalysis[]>;
  private readonly MAX_HISTORY_PER_PERSON = 100;
  private readonly MOOD_ANALYSIS_WINDOW = 10; // Nombre d'expressions à analyser pour la tendance

  private constructor() {
    this.expressionHistory = new Map();
    this.setupEventListeners();
  }

  public static getInstance(): ExpressionAnalysisService {
    if (!ExpressionAnalysisService.instance) {
      ExpressionAnalysisService.instance = new ExpressionAnalysisService();
    }
    return ExpressionAnalysisService.instance;
  }

  private setupEventListeners(): void {
    eventService.subscribe({
      id: 'expression-analysis',
      eventTypes: ['face-detected'],
      callback: this.handleFaceDetected.bind(this)
    });
  }

  private async handleFaceDetected(event: any): Promise<void> {
    const detectedFace: DetectedFace = event.data;
    
    try {
      // Analyser l'expression
      const analysis = this.analyzeExpression(detectedFace);
      
      // Sauvegarder l'analyse
      this.saveExpressionAnalysis(analysis);
      
      // Prédire l'humeur
      const prediction = this.predictMood(detectedFace.name);
      
      // Émettre les événements
      eventService.emit('expression-analyzed', { analysis, prediction }, 'ExpressionAnalysisService');
      
      // Créer des notifications si nécessaire
      this.handleNotifications(analysis, prediction);
      
      loggingService.info('Expression analysis completed', { analysis, prediction });
    } catch (error) {
      loggingService.error('Error analyzing expression', error as Error);
    }
  }

  private analyzeExpression(face: DetectedFace): ExpressionAnalysis {
    const emotions = face.expressions;
    let dominantEmotion = 'neutral';
    let maxConfidence = 0;

    // Trouver l'émotion dominante
    Object.entries(emotions).forEach(([emotion, confidence]) => {
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        dominantEmotion = emotion;
      }
    });

    return {
      dominantEmotion,
      emotionConfidence: maxConfidence,
      emotionDistribution: emotions,
      timestamp: new Date(),
      personName: face.name
    };
  }

  private saveExpressionAnalysis(analysis: ExpressionAnalysis): void {
    const personHistory = this.expressionHistory.get(analysis.personName) || [];
    personHistory.unshift(analysis);
    
    // Limiter la taille de l'historique
    if (personHistory.length > this.MAX_HISTORY_PER_PERSON) {
      personHistory.pop();
    }
    
    this.expressionHistory.set(analysis.personName, personHistory);
  }

  public predictMood(personName: string): MoodPrediction {
    const history = this.expressionHistory.get(personName) || [];
    const recentHistory = history.slice(0, this.MOOD_ANALYSIS_WINDOW);
    
    if (recentHistory.length === 0) {
      return {
        currentMood: 'unknown',
        confidence: 0,
        previousMoods: [],
        moodTrend: 'stable'
      };
    }

    // Calculer la tendance des émotions
    const emotionScores = this.calculateEmotionScores(recentHistory);
    const currentMood = this.determineMood(emotionScores);
    const moodTrend = this.analyzeMoodTrend(recentHistory);
    
    return {
      currentMood: currentMood.mood,
      confidence: currentMood.confidence,
      previousMoods: recentHistory.map(h => h.dominantEmotion),
      moodTrend,
      suggestedActions: this.getSuggestedActions(currentMood.mood, moodTrend)
    };
  }

  private calculateEmotionScores(history: ExpressionAnalysis[]): Map<string, number> {
    const scores = new Map<string, number>();
    
    history.forEach((analysis, index) => {
      const weight = 1 / (index + 1); // Plus récent = plus important
      Object.entries(analysis.emotionDistribution).forEach(([emotion, value]) => {
        const currentScore = scores.get(emotion) || 0;
        scores.set(emotion, currentScore + value * weight);
      });
    });
    
    return scores;
  }

  private determineMood(emotionScores: Map<string, number>): { mood: string; confidence: number } {
    let maxScore = 0;
    let dominantMood = 'neutral';
    
    emotionScores.forEach((score, emotion) => {
      if (score > maxScore) {
        maxScore = score;
        dominantMood = emotion;
      }
    });
    
    // Normaliser le score de confiance
    const totalScore = Array.from(emotionScores.values()).reduce((a, b) => a + b, 0);
    const confidence = maxScore / totalScore;
    
    return { mood: dominantMood, confidence };
  }

  private analyzeMoodTrend(history: ExpressionAnalysis[]): MoodPrediction['moodTrend'] {
    if (history.length < 2) return 'stable';

    const positiveEmotions = ['happy', 'surprised'];
    const negativeEmotions = ['sad', 'angry', 'fearful', 'disgusted'];

    const recentPositiveRatio = this.calculateEmotionRatio(history.slice(0, 3), positiveEmotions);
    const olderPositiveRatio = this.calculateEmotionRatio(history.slice(-3), positiveEmotions);

    const difference = recentPositiveRatio - olderPositiveRatio;
    
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  private calculateEmotionRatio(history: ExpressionAnalysis[], targetEmotions: string[]): number {
    if (history.length === 0) return 0;

    const total = history.length;
    const matching = history.filter(h => targetEmotions.includes(h.dominantEmotion)).length;
    
    return matching / total;
  }

  private getSuggestedActions(mood: string, trend: MoodPrediction['moodTrend']): string[] {
    const suggestions: string[] = [];

    if (trend === 'declining') {
      suggestions.push('Activer la scène "Détente"');
      suggestions.push('Ajuster l\'éclairage pour une ambiance plus apaisante');
      suggestions.push('Proposer une playlist relaxante');
    }

    switch (mood) {
      case 'sad':
        suggestions.push('Augmenter la luminosité');
        suggestions.push('Jouer de la musique énergique');
        break;
      case 'angry':
        suggestions.push('Activer la ventilation');
        suggestions.push('Réduire l\'intensité lumineuse');
        suggestions.push('Mettre de la musique calme');
        break;
      case 'happy':
        suggestions.push('Maintenir l\'ambiance actuelle');
        suggestions.push('Prendre une photo souvenir');
        break;
    }

    return suggestions;
  }

  private handleNotifications(analysis: ExpressionAnalysis, prediction: MoodPrediction): void {
    // Notifier des changements d'humeur significatifs
    if (prediction.moodTrend === 'declining') {
      notificationService.createNotification({
        type: 'mood-alert',
        title: 'Changement d\'humeur détecté',
        message: `L'humeur de ${analysis.personName} semble se dégrader. Actions suggérées disponibles.`,
        severity: 'warning',
        metadata: { analysis, prediction }
      });
    }

    // Notifier des émotions extrêmes
    if (analysis.emotionConfidence > 0.8) {
      if (['angry', 'sad'].includes(analysis.dominantEmotion)) {
        notificationService.createNotification({
          type: 'emotion-alert',
          title: 'Émotion intense détectée',
          message: `${analysis.personName} montre des signes de ${analysis.dominantEmotion}`,
          severity: 'warning',
          metadata: { analysis }
        });
      }
    }
  }

  public getExpressionHistory(
    personName: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): ExpressionAnalysis[] {
    let history = this.expressionHistory.get(personName) || [];

    if (options.startDate) {
      history = history.filter(h => h.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      history = history.filter(h => h.timestamp <= options.endDate!);
    }

    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  public getEmotionStats(personName: string): {
    totalAnalyses: number;
    emotionDistribution: { [key: string]: number };
    averageConfidence: number;
  } {
    const history = this.expressionHistory.get(personName) || [];
    const totalAnalyses = history.length;
    
    if (totalAnalyses === 0) {
      return {
        totalAnalyses: 0,
        emotionDistribution: {},
        averageConfidence: 0
      };
    }

    const emotionCounts: { [key: string]: number } = {};
    let totalConfidence = 0;

    history.forEach(analysis => {
      emotionCounts[analysis.dominantEmotion] = (emotionCounts[analysis.dominantEmotion] || 0) + 1;
      totalConfidence += analysis.emotionConfidence;
    });

    const emotionDistribution: { [key: string]: number } = {};
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      emotionDistribution[emotion] = count / totalAnalyses;
    });

    return {
      totalAnalyses,
      emotionDistribution,
      averageConfidence: totalConfidence / totalAnalyses
    };
  }

  public clearHistory(personName?: string): void {
    if (personName) {
      this.expressionHistory.delete(personName);
    } else {
      this.expressionHistory.clear();
    }
    
    loggingService.info(`Expression history cleared${personName ? ` for ${personName}` : ''}`);
  }
}

export const expressionAnalysisService = ExpressionAnalysisService.getInstance();
