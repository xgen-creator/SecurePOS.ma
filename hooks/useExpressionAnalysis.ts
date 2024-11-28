import { useState, useEffect, useCallback } from 'react';
import FaceExpressionAnalyzer, {
  ExpressionData,
  ExpressionStats,
  ExpressionTrigger
} from '../services/recognition/FaceExpressionAnalyzer';
import { useNotificationManager } from './useNotificationManager';
import SceneActionService from '../services/automation/SceneActionService';

interface UseExpressionAnalysisProps {
  profileId: string;
  onExpressionAnalyzed?: (data: ExpressionData) => void;
  onTriggerActivated?: (trigger: ExpressionTrigger, data: ExpressionData) => void;
}

export function useExpressionAnalysis({
  profileId,
  onExpressionAnalyzed,
  onTriggerActivated
}: UseExpressionAnalysisProps) {
  const [stats, setStats] = useState<ExpressionStats | undefined>();
  const [triggers, setTriggers] = useState<ExpressionTrigger[]>([]);
  const [predictions, setPredictions] = useState<{ [key: string]: number } | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { sendNotification } = useNotificationManager();
  const analyzer = FaceExpressionAnalyzer.getInstance();

  useEffect(() => {
    // Charger les données initiales
    const loadData = async () => {
      setStats(analyzer.getProfileStats(profileId));
      setTriggers(analyzer.getProfileTriggers(profileId));
      
      const newPredictions = await analyzer.predictMood(profileId);
      setPredictions(newPredictions);

      const newInsights = await analyzer.generateInsights(profileId);
      setInsights(newInsights);
    };

    loadData();

    // Écouter les événements
    const handleExpressionAnalyzed = (data: ExpressionData) => {
      if (data.profileId === profileId) {
        setStats(analyzer.getProfileStats(profileId));
        onExpressionAnalyzed?.(data);
      }
    };

    const handleTriggerActivated = async ({
      trigger,
      expressionData
    }: {
      trigger: ExpressionTrigger;
      expressionData: ExpressionData;
    }) => {
      if (trigger.profileId === profileId) {
        onTriggerActivated?.(trigger, expressionData);

        // Activer la scène associée si définie
        if (trigger.actions.sceneId) {
          try {
            await SceneActionService.activateScene(trigger.actions.sceneId);
            sendNotification(
              'Scène activée',
              `La scène a été activée en réponse à l'expression "${trigger.expression}"`,
              { type: 'info', source: 'expressionAnalysis' }
            );
          } catch (error) {
            sendNotification(
              'Erreur d\'activation',
              'Impossible d\'activer la scène associée',
              { type: 'error', source: 'expressionAnalysis' }
            );
          }
        }

        // Exécuter l'action personnalisée si définie
        if (trigger.actions.customAction) {
          // TODO: Implémenter l'exécution des actions personnalisées
        }
      }
    };

    analyzer.on('expressionAnalyzed', handleExpressionAnalyzed);
    analyzer.on('triggerActivated', handleTriggerActivated);

    return () => {
      analyzer.off('expressionAnalyzed', handleExpressionAnalyzed);
      analyzer.off('triggerActivated', handleTriggerActivated);
    };
  }, [profileId]);

  const analyzeExpression = useCallback(async (
    expressions: { [key: string]: number }
  ) => {
    if (isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      const data = await analyzer.analyzeExpression(profileId, expressions);
      return data;
    } catch (error) {
      sendNotification(
        'Erreur d\'analyse',
        'Une erreur est survenue lors de l\'analyse des expressions',
        { type: 'error', source: 'expressionAnalysis' }
      );
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [profileId, isAnalyzing]);

  const addTrigger = useCallback(async (
    trigger: Omit<ExpressionTrigger, 'id' | 'profileId'>
  ) => {
    try {
      const newTrigger: ExpressionTrigger = {
        ...trigger,
        id: Math.random().toString(36).substr(2, 9),
        profileId
      };

      await analyzer.addTrigger(newTrigger);
      setTriggers(analyzer.getProfileTriggers(profileId));

      sendNotification(
        'Déclencheur ajouté',
        `Le déclencheur pour l'expression "${trigger.expression}" a été ajouté`,
        { type: 'success', source: 'expressionAnalysis' }
      );

      return newTrigger;
    } catch (error) {
      sendNotification(
        'Erreur',
        'Impossible d\'ajouter le déclencheur',
        { type: 'error', source: 'expressionAnalysis' }
      );
      return null;
    }
  }, [profileId]);

  const removeTrigger = useCallback(async (triggerId: string) => {
    try {
      const success = await analyzer.removeTrigger(profileId, triggerId);
      if (success) {
        setTriggers(analyzer.getProfileTriggers(profileId));
        sendNotification(
          'Déclencheur supprimé',
          'Le déclencheur a été supprimé avec succès',
          { type: 'success', source: 'expressionAnalysis' }
        );
      }
      return success;
    } catch (error) {
      sendNotification(
        'Erreur',
        'Impossible de supprimer le déclencheur',
        { type: 'error', source: 'expressionAnalysis' }
      );
      return false;
    }
  }, [profileId]);

  const refreshPredictions = useCallback(async (
    timeframe?: number
  ) => {
    const newPredictions = await analyzer.predictMood(profileId, timeframe);
    setPredictions(newPredictions);
    return newPredictions;
  }, [profileId]);

  const refreshInsights = useCallback(async () => {
    const newInsights = await analyzer.generateInsights(profileId);
    setInsights(newInsights);
    return newInsights;
  }, [profileId]);

  return {
    stats,
    triggers,
    predictions,
    insights,
    isAnalyzing,
    analyzeExpression,
    addTrigger,
    removeTrigger,
    refreshPredictions,
    refreshInsights
  };
}
