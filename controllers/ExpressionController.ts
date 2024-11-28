import { Request, Response } from 'express';
import { ExpressionService } from '../services/ExpressionService';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

export class ExpressionController {
  private service: ExpressionService;

  constructor() {
    this.service = new ExpressionService();
  }

  public analyzeExpression = catchAsync(async (req: Request, res: Response) => {
    const { profileId, expressions } = req.body;
    const result = await this.service.analyzeExpression(profileId, expressions);
    res.json(result);
  });

  public getExpressionStats = catchAsync(async (req: Request, res: Response) => {
    const { profileId } = req.params;
    const stats = await this.service.getExpressionStats(profileId);
    if (!stats) {
      throw new ApiError(404, 'Statistics not found for this profile');
    }
    res.json(stats);
  });

  public getPredictions = catchAsync(async (req: Request, res: Response) => {
    const { profileId } = req.params;
    const { timeframe } = req.query;
    const predictions = await this.service.predictMood(
      profileId,
      timeframe ? parseInt(timeframe as string) : undefined
    );
    if (!predictions) {
      throw new ApiError(404, 'Not enough data for predictions');
    }
    res.json(predictions);
  });

  public getInsights = catchAsync(async (req: Request, res: Response) => {
    const { profileId } = req.params;
    const insights = await this.service.generateInsights(profileId);
    res.json(insights);
  });

  public getProfileTriggers = catchAsync(async (req: Request, res: Response) => {
    const { profileId } = req.params;
    const triggers = await this.service.getProfileTriggers(profileId);
    res.json(triggers);
  });

  public createTrigger = catchAsync(async (req: Request, res: Response) => {
    const trigger = await this.service.createTrigger(req.body);
    res.status(201).json(trigger);
  });

  public updateTrigger = catchAsync(async (req: Request, res: Response) => {
    const { triggerId } = req.params;
    const updatedTrigger = await this.service.updateTrigger(triggerId, req.body);
    if (!updatedTrigger) {
      throw new ApiError(404, 'Trigger not found');
    }
    res.json(updatedTrigger);
  });

  public deleteTrigger = catchAsync(async (req: Request, res: Response) => {
    const { triggerId } = req.params;
    const success = await this.service.deleteTrigger(triggerId);
    if (!success) {
      throw new ApiError(404, 'Trigger not found');
    }
    res.status(204).send();
  });
}
