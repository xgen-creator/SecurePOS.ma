import { Schema, model, Document } from 'mongoose';

// Interface pour les données d'expression
export interface IExpressionData extends Document {
  profileId: string;
  timestamp: number;
  expressions: {
    [key: string]: number;
  };
  dominantExpression: string;
  confidence: number;
}

// Interface pour les statistiques d'expression
export interface IExpressionStats extends Document {
  profileId: string;
  expressionHistory: IExpressionData[];
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

// Interface pour les déclencheurs d'expression
export interface IExpressionTrigger extends Document {
  profileId: string;
  expression: string;
  minConfidence: number;
  timeWindow: {
    start?: number;
    end?: number;
  };
  actions: {
    sceneId?: string;
    customAction?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schéma pour les données d'expression
const ExpressionDataSchema = new Schema({
  profileId: { type: String, required: true, index: true },
  timestamp: { type: Number, required: true },
  expressions: { type: Map, of: Number, required: true },
  dominantExpression: { type: String, required: true },
  confidence: { type: Number, required: true }
});

// Schéma pour les statistiques d'expression
const ExpressionStatsSchema = new Schema({
  profileId: { type: String, required: true, unique: true },
  expressionHistory: [ExpressionDataSchema],
  commonExpressions: {
    type: Map,
    of: {
      frequency: Number,
      averageConfidence: Number,
      timeOfDay: {
        morning: Number,
        afternoon: Number,
        evening: Number,
        night: Number
      }
    }
  },
  lastAnalysis: { type: Number, required: true }
});

// Schéma pour les déclencheurs d'expression
const ExpressionTriggerSchema = new Schema({
  profileId: { type: String, required: true, index: true },
  expression: { type: String, required: true },
  minConfidence: { type: Number, required: true },
  timeWindow: {
    start: { type: Number },
    end: { type: Number }
  },
  actions: {
    sceneId: { type: String },
    customAction: { type: String }
  }
}, { timestamps: true });

// Création des index
ExpressionDataSchema.index({ profileId: 1, timestamp: -1 });
ExpressionTriggerSchema.index({ profileId: 1, expression: 1 });

// Création des modèles
export const ExpressionData = model<IExpressionData>('ExpressionData', ExpressionDataSchema);
export const ExpressionStats = model<IExpressionStats>('ExpressionStats', ExpressionStatsSchema);
export const ExpressionTrigger = model<IExpressionTrigger>('ExpressionTrigger', ExpressionTriggerSchema);
