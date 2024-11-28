import { EventEmitter } from 'events';
import {
  ExpressionData,
  ExpressionStats,
  ExpressionTrigger,
  IExpressionData,
  IExpressionStats,
  IExpressionTrigger
} from '../database/schema';
import { ApiError } from '../utils/ApiError';
import { SceneActionService } from './SceneActionService';
import { config } from '../config';

export class ExpressionService extends EventEmitter {
  private static instance: ExpressionService;

  private constructor() {
    super();
  }

  public static getInstance(): ExpressionService {
    if (!ExpressionService.instance) {
      ExpressionService.instance = new ExpressionService();
    }
    return ExpressionService.instance;
  }

  public async analyzeExpression(
    profileId: string,
    expressions: { [key: string]: number }
  ): Promise<IExpressionData> {
    // Trouver l'expression dominante
    const entries = Object.entries(expressions);
    const dominantExpression = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const confidence = expressions[dominantExpression];

    // Créer les données d'expression
    const expressionData = await ExpressionData.create({
      profileId,
      timestamp: Date.now(),
      expressions,
      dominantExpression,
      confidence
    });

    // Mettre à jour les statistiques
    await this.updateStats(expressionData);

    // Vérifier les déclencheurs
    await this.checkTriggers(expressionData);

    this.emit('expressionAnalyzed', expressionData);
    return expressionData;
  }

  private async updateStats(data: IExpressionData): Promise<void> {
    let stats = await ExpressionStats.findOne({ profileId: data.profileId });
    
    if (!stats) {
      stats = new ExpressionStats({
        profileId: data.profileId,
        expressionHistory: [],
        commonExpressions: {},
        lastAnalysis: 0
      });
    }

    // Mettre à jour l'historique
    stats.expressionHistory.push(data);
    if (stats.expressionHistory.length > config.faceApi.maxHistorySize) {
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
    await stats.save();
  }

  private async checkTriggers(data: IExpressionData): Promise<void> {
    const triggers = await ExpressionTrigger.find({
      profileId: data.profileId,
      expression: data.dominantExpression,
      minConfidence: { $lte: data.confidence }
    });

    const hour = new Date(data.timestamp).getHours();

    for (const trigger of triggers) {
      if (
        trigger.timeWindow.start === undefined ||
        trigger.timeWindow.end === undefined ||
        (hour >= trigger.timeWindow.start && hour <= trigger.timeWindow.end)
      ) {
        this.emit('triggerActivated', { trigger, expressionData: data });

        if (trigger.actions.sceneId) {
          try {
            await SceneActionService.activateScene(trigger.actions.sceneId);
          } catch (error) {
            console.error('Failed to activate scene:', error);
          }
        }

        if (trigger.actions.customAction) {
          // TODO: Implémenter l'exécution des actions personnalisées
        }
      }
    }
  }

  public async getExpressionStats(profileId: string): Promise<IExpressionStats | null> {
    return ExpressionStats.findOne({ profileId });
  }

  public async predictMood(
    profileId: string,
    timeframe: number = 24 * 60 * 60 * 1000
  ): Promise<{ [key: string]: number } | null> {
    const stats = await ExpressionStats.findOne({ profileId });
    if (!stats || stats.expressionHistory.length < config.faceApi.minSamplesForAnalysis) {
      return null;
    }

    const recentExpressions = stats.expressionHistory.filter(
      data => Date.now() - data.timestamp <= timeframe
    );

    if (recentExpressions.length < config.faceApi.minSamplesForAnalysis) {
      return null;
    }

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

  public async generateInsights(profileId: string): Promise<string[]> {
    const stats = await ExpressionStats.findOne({ profileId });
    if (!stats || stats.expressionHistory.length < config.faceApi.minSamplesForAnalysis) {
      return ['Pas assez de données pour générer des insights'];
    }

    const insights: string[] = [];
    const commonExpressions = stats.commonExpressions;

    // Expression la plus fréquente
    const mostCommon = Object.entries(commonExpressions).reduce(
      (a, b) => a[1].frequency > b[1].frequency ? a : b
    );
    insights.push(
      `Expression la plus fréquente : ${mostCommon[0]} (${Math.round(mostCommon[1].frequency / stats.expressionHistory.length * 100)}% du temps)`
    );

    // Tendances par moment de la journée
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

  public async getProfileTriggers(profileId: string): Promise<IExpressionTrigger[]> {
    return ExpressionTrigger.find({ profileId });
  }

  public async createTrigger(data: Partial<IExpressionTrigger>): Promise<IExpressionTrigger> {
    if (!data.profileId || !data.expression || !data.minConfidence) {
      throw new ApiError(400, 'Missing required trigger fields');
    }

    const trigger = await ExpressionTrigger.create(data);
    this.emit('triggerCreated', trigger);
    return trigger;
  }

  public async updateTrigger(
    triggerId: string,
    data: Partial<IExpressionTrigger>
  ): Promise<IExpressionTrigger | null> {
    const trigger = await ExpressionTrigger.findByIdAndUpdate(
      triggerId,
      { $set: data },
      { new: true }
    );

    if (trigger) {
      this.emit('triggerUpdated', trigger);
    }

    return trigger;
  }

  public async deleteTrigger(triggerId: string): Promise<boolean> {
    const result = await ExpressionTrigger.findByIdAndDelete(triggerId);
    if (result) {
      this.emit('triggerDeleted', result);
      return true;
    }
    return false;
  }

  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
}
