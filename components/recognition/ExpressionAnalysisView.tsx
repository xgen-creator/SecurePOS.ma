import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, List, Divider, IconButton } from 'react-native-paper';
import { useExpressionAnalysis } from '../../hooks/useExpressionAnalysis';
import { ExpressionTrigger } from '../../services/recognition/FaceExpressionAnalyzer';
import { SceneSelector } from './SceneSelector';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { ConfidenceSlider } from '../common/ConfidenceSlider';
import { Chart } from '../common/Chart';

interface ExpressionAnalysisViewProps {
  profileId: string;
  onSceneActivated?: (sceneId: string) => void;
}

export const ExpressionAnalysisView: React.FC<ExpressionAnalysisViewProps> = ({
  profileId,
  onSceneActivated
}) => {
  const {
    stats,
    triggers,
    predictions,
    insights,
    isAnalyzing,
    addTrigger,
    removeTrigger,
    refreshPredictions,
    refreshInsights
  } = useExpressionAnalysis({
    profileId,
    onTriggerActivated: (trigger, data) => {
      if (trigger.actions.sceneId) {
        onSceneActivated?.(trigger.actions.sceneId);
      }
    }
  });

  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<string>('');
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<{ start?: number; end?: number }>({});
  const [minConfidence, setMinConfidence] = useState(0.7);

  const handleAddTrigger = useCallback(async () => {
    if (!selectedExpression || !selectedSceneId) return;

    const newTrigger = await addTrigger({
      expression: selectedExpression,
      minConfidence,
      timeWindow,
      actions: {
        sceneId: selectedSceneId
      }
    });

    if (newTrigger) {
      setShowAddTrigger(false);
      setSelectedExpression('');
      setSelectedSceneId('');
      setTimeWindow({});
      setMinConfidence(0.7);
    }
  }, [selectedExpression, selectedSceneId, timeWindow, minConfidence]);

  const renderTriggerItem = (trigger: ExpressionTrigger) => (
    <List.Item
      key={trigger.id}
      title={`Expression: ${trigger.expression}`}
      description={`Confiance min: ${trigger.minConfidence * 100}%${
        trigger.timeWindow.start !== undefined
          ? ` | ${trigger.timeWindow.start}h-${trigger.timeWindow.end}h`
          : ''
      }`}
      right={props => (
        <IconButton
          {...props}
          icon="delete"
          onPress={() => removeTrigger(trigger.id)}
        />
      )}
    />
  );

  const renderStats = () => {
    if (!stats) return null;

    const expressionData = Object.entries(stats.commonExpressions).map(
      ([expression, data]) => ({
        expression,
        frequency: data.frequency,
        confidence: data.averageConfidence
      })
    );

    return (
      <Card style={styles.card}>
        <Card.Title title="Statistiques d'expressions" />
        <Card.Content>
          <Chart
            data={expressionData}
            xKey="expression"
            yKey="frequency"
            type="bar"
            height={200}
          />
          <Divider style={styles.divider} />
          <Text style={styles.subtitle}>Distribution par moment de la journée</Text>
          {Object.entries(stats.commonExpressions).map(([expression, data]) => (
            <View key={expression} style={styles.timeDistribution}>
              <Text>{expression}</Text>
              <View style={styles.timeBar}>
                {Object.entries(data.timeOfDay).map(([time, count]) => (
                  <View
                    key={time}
                    style={[
                      styles.timeSegment,
                      { flex: count / data.frequency }
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderPredictions = () => {
    if (!predictions) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Prédictions d'humeur" />
        <Card.Content>
          <Chart
            data={Object.entries(predictions).map(([expression, probability]) => ({
              expression,
              probability: probability * 100
            }))}
            xKey="expression"
            yKey="probability"
            type="pie"
            height={200}
          />
          <Button
            mode="outlined"
            onPress={() => refreshPredictions()}
            style={styles.button}
          >
            Rafraîchir les prédictions
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderInsights = () => {
    if (!insights.length) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Insights" />
        <Card.Content>
          {insights.map((insight, index) => (
            <Text key={index} style={styles.insight}>
              • {insight}
            </Text>
          ))}
          <Button
            mode="outlined"
            onPress={() => refreshInsights()}
            style={styles.button}
          >
            Rafraîchir les insights
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderStats()}
      {renderPredictions()}
      {renderInsights()}

      <Card style={styles.card}>
        <Card.Title title="Déclencheurs d'expressions" />
        <Card.Content>
          {triggers.map(renderTriggerItem)}
          
          {showAddTrigger ? (
            <View style={styles.addTriggerForm}>
              <List.Section>
                <List.Subheader>Expression</List.Subheader>
                <View style={styles.expressionButtons}>
                  {['happy', 'sad', 'angry', 'surprised', 'neutral'].map(expression => (
                    <Button
                      key={expression}
                      mode={selectedExpression === expression ? 'contained' : 'outlined'}
                      onPress={() => setSelectedExpression(expression)}
                      style={styles.expressionButton}
                    >
                      {expression}
                    </Button>
                  ))}
                </View>

                <List.Subheader>Confiance minimale</List.Subheader>
                <ConfidenceSlider
                  value={minConfidence}
                  onValueChange={setMinConfidence}
                />

                <List.Subheader>Plage horaire (optionnel)</List.Subheader>
                <TimeRangePicker
                  startTime={timeWindow.start}
                  endTime={timeWindow.end}
                  onTimeChange={setTimeWindow}
                />

                <List.Subheader>Scène à activer</List.Subheader>
                <SceneSelector
                  selectedSceneId={selectedSceneId}
                  onSceneSelected={setSelectedSceneId}
                />

                <View style={styles.buttonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowAddTrigger(false)}
                    style={styles.button}
                  >
                    Annuler
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleAddTrigger}
                    disabled={!selectedExpression || !selectedSceneId}
                    style={styles.button}
                  >
                    Ajouter
                  </Button>
                </View>
              </List.Section>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={() => setShowAddTrigger(true)}
              style={styles.button}
            >
              Ajouter un déclencheur
            </Button>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  card: {
    marginBottom: 16
  },
  divider: {
    marginVertical: 16
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  timeDistribution: {
    marginVertical: 4
  },
  timeBar: {
    flexDirection: 'row',
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4
  },
  timeSegment: {
    height: '100%',
    backgroundColor: '#2196F3'
  },
  button: {
    marginTop: 8
  },
  insight: {
    marginVertical: 4
  },
  addTriggerForm: {
    marginTop: 16
  },
  expressionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  expressionButton: {
    margin: 4,
    flexGrow: 1
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16
  }
});
