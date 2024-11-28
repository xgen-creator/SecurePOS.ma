import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { EventEmitter } from 'events';
import { Storage } from '../storage/Storage';

export interface ExpressionData {
  timestamp: number;
  profileId: string;
  expressions: {
    [key: string]: number;
  };
  dominantExpression: string;
  confidence: number;
}

export interface ExpressionStats {
  profileId: string;
  expressionHistory: ExpressionData[];
  commonExpressions: {
    [key: string]: {
      frequency: number;
      averageConfidence: number;
      timeOfDay: {
        morning: number;
        afternoon: number;
        evening: number;
        night: number;
      };
    };
  };
  lastAnalysis: number;
}

export interface ExpressionTrigger {
  id: string;
  profileId: string;
  expression: string;
  minConfidence: number;
  timeWindow: {
    start?: number; // Hour of day (0-23)
    end?: number;   // Hour of day (0-23)
  };
  actions: {
    sceneId?: string;
    customAction?: string;
  };
}

class FaceExpressionAnalyzer extends EventEmitter {
  private static instance: FaceExpressionAnalyzer;
  private expressionStats: Map<string, ExpressionStats>;
  private expressionTriggers: Map<string, ExpressionTrigger[]>;
  private readonly MAX_HISTORY_PER_PROFILE = 1000;
  private readonly MIN_SAMPLES_FOR_ANALYSIS = 50;

  private constructor() {
    super();
    this.expressionStats = new Map();
    this.expressionTriggers = new Map();
    this.loadData();
  }

  public static getInstance(): FaceExpressionAnalyzer {
    if (!FaceExpressionAnalyzer.instance) {
      FaceExpressionAnalyzer.instance = new FaceExpressionAnalyzer();
    }
    return FaceExpressionAnalyzer.instance;
  }

  private async loadData() {
    try {
      const stats = await Storage.get('expressionStats');
      if (stats) {
        this.expressionStats = new Map(Object.entries(stats));
      }

      const triggers = await Storage.get('expressionTriggers');
      if (triggers) {
        this.expressionTriggers = new Map(Object.entries(triggers));
      }
    } catch (error) {
      console.error('Error loading expression data:', error);
    }
  }

  private async saveData() {
    try {
      await Storage.set('expressionStats', Object.fromEntries(this.expressionStats));
      await Storage.set('expressionTriggers', Object.fromEntries(this.expressionTriggers));
    } catch (error) {
      console.error('Error saving expression data:', error);
    }
  }

  public async analyzeExpression(
    profileId: string,
    expressions: { [key: string]: number }
  ): Promise<ExpressionData> {
    const timestamp = Date.now();
    const entries = Object.entries(expressions);
    const dominantExpression = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const confidence = expressions[dominantExpression];

    const expressionData: ExpressionData = {
      timestamp,
      profileId,
      expressions,
      dominantExpression,
      confidence
    };

    // Mettre à jour les statistiques
    await this.updateStats(expressionData);

    // Vérifier les déclencheurs
    await this.checkTriggers(expressionData);

    this.emit('expressionAnalyzed', expressionData);
    return expressionData;
  }

  private async updateStats(data: ExpressionData) {
    let stats = this.expressionStats.get(data.profileId);
    
    if (!stats) {
      stats = {
        profileId: data.profileId,
        expressionHistory: [],
        commonExpressions: {},
        lastAnalysis: 0
      };
    }

    // Ajouter à l'historique
    stats.expressionHistory.push(data);
    if (stats.expressionHistory.length > this.MAX_HISTORY_PER_PROFILE) {
      stats.expressionHistory.shift();
    }

    // Mettre à jour les statistiques communes
    const hour = new Date(data.timestamp).getHours();
    const timeOfDay = this.getTimeOfDay(hour);

    Object.entries(data.expressions).forEach(([expression, confidence]) => {
      if (!stats!.commonExpressions[expression]) {
        stats!.commonExpressions[expression] = {
          frequency: 0,
          averageConfidence: 0,
          timeOfDay: {
            morning: 0,
            afternoon: 0,
            evening: 0,
            night: 0
          }
        };
      }

      const expressionStats = stats!.commonExpressions[expression];
      expressionStats.frequency++;
      expressionStats.averageConfidence = (
        (expressionStats.averageConfidence * (expressionStats.frequency - 1) + confidence) /
        expressionStats.frequency
      );
      expressionStats.timeOfDay[timeOfDay]++;
    });

    stats.lastAnalysis = data.timestamp;
    this.expressionStats.set(data.profileId, stats);
    await this.saveData();
  }

  private async checkTriggers(data: ExpressionData) {
    const triggers = this.expressionTriggers.get(data.profileId) || [];
    const hour = new Date(data.timestamp).getHours();

    for (const trigger of triggers) {
      // Vérifier si l'expression correspond
      if (
        trigger.expression === data.dominantExpression &&
        data.confidence >= trigger.minConfidence
      ) {
        // Vérifier la fenêtre temporelle
        if (
          trigger.timeWindow.start === undefined ||
          trigger.timeWindow.end === undefined ||
          (hour >= trigger.timeWindow.start && hour <= trigger.timeWindow.end)
        ) {
          this.emit('triggerActivated', {
            trigger,
            expressionData: data
          });
        }
      }
    }
  }

  public async addTrigger(trigger: ExpressionTrigger): Promise<void> {
    const triggers = this.expressionTriggers.get(trigger.profileId) || [];
    triggers.push(trigger);
    this.expressionTriggers.set(trigger.profileId, triggers);
    await this.saveData();
    this.emit('triggerAdded', trigger);
  }

  public async removeTrigger(profileId: string, triggerId: string): Promise<boolean> {
    const triggers = this.expressionTriggers.get(profileId);
    if (!triggers) return false;

    const index = triggers.findIndex(t => t.id === triggerId);
    if (index === -1) return false;

    triggers.splice(index, 1);
    this.expressionTriggers.set(profileId, triggers);
    await this.saveData();
    this.emit('triggerRemoved', { profileId, triggerId });
    return true;
  }

  public getProfileStats(profileId: string): ExpressionStats | undefined {
    return this.expressionStats.get(profileId);
  }

  public getProfileTriggers(profileId: string): ExpressionTrigger[] {
    return this.expressionTriggers.get(profileId) || [];
  }

  public async predictMood(
    profileId: string,
    timeframe: number = 24 * 60 * 60 * 1000 // 24 heures par défaut
  ): Promise<{ [key: string]: number } | null> {
    const stats = this.expressionStats.get(profileId);
    if (!stats || stats.expressionHistory.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return null;
    }

    const recentExpressions = stats.expressionHistory.filter(
      data => Date.now() - data.timestamp <= timeframe
    );

    if (recentExpressions.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return null;
    }

    // Calculer les probabilités basées sur l'historique
    const totalSamples = recentExpressions.length;
    const predictions: { [key: string]: number } = {};

    Object.keys(recentExpressions[0].expressions).forEach(expression => {
      const count = recentExpressions.filter(
        data => data.dominantExpression === expression
      ).length;
      predictions[expression] = count / totalSamples;
    });

    return predictions;
  }

  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  public async generateInsights(profileId: string): Promise<string[]> {
    const stats = this.expressionStats.get(profileId);
    if (!stats || stats.expressionHistory.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return ['Pas assez de données pour générer des insights'];
    }

    const insights: string[] = [];
    const commonExpressions = stats.commonExpressions;

    // Trouver l'expression la plus fréquente
    const mostCommon = Object.entries(commonExpressions).reduce(
      (a, b) => a[1].frequency > b[1].frequency ? a : b
    );
    insights.push(
      `Expression la plus fréquente : ${mostCommon[0]} (${Math.round(mostCommon[1].frequency / stats.expressionHistory.length * 100)}% du temps)`
    );

    // Analyser les tendances par moment de la journée
    Object.entries(commonExpressions).forEach(([expression, data]) => {
      const maxTime = Object.entries(data.timeOfDay).reduce(
        (a, b) => a[1] > b[1] ? a : b
      );
      if (maxTime[1] > 0) {
        insights.push(
          `${expression} est plus fréquent ${maxTime[0]} (${Math.round(maxTime[1] / data.frequency * 100)}% des occurrences)`
        );
      }
    });

    return insights;
  }
}

export default FaceExpressionAnalyzer.getInstance();
