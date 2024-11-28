import Joi from 'joi';

export const expressionValidation = {
  analyze: {
    body: Joi.object().keys({
      profileId: Joi.string().required(),
      expressions: Joi.object().pattern(
        Joi.string(),
        Joi.number().min(0).max(1)
      ).required()
    })
  },

  getStats: {
    params: Joi.object().keys({
      profileId: Joi.string().required()
    })
  },

  getPredictions: {
    params: Joi.object().keys({
      profileId: Joi.string().required()
    }),
    query: Joi.object().keys({
      timeframe: Joi.number().integer().min(0)
    })
  },

  getInsights: {
    params: Joi.object().keys({
      profileId: Joi.string().required()
    })
  },

  getTriggers: {
    params: Joi.object().keys({
      profileId: Joi.string().required()
    })
  },

  createTrigger: {
    body: Joi.object().keys({
      profileId: Joi.string().required(),
      expression: Joi.string().required(),
      minConfidence: Joi.number().min(0).max(1).required(),
      timeWindow: Joi.object().keys({
        start: Joi.number().integer().min(0).max(23),
        end: Joi.number().integer().min(0).max(23)
      }),
      actions: Joi.object().keys({
        sceneId: Joi.string(),
        customAction: Joi.string()
      }).or('sceneId', 'customAction')
    })
  },

  updateTrigger: {
    params: Joi.object().keys({
      triggerId: Joi.string().required()
    }),
    body: Joi.object().keys({
      expression: Joi.string(),
      minConfidence: Joi.number().min(0).max(1),
      timeWindow: Joi.object().keys({
        start: Joi.number().integer().min(0).max(23),
        end: Joi.number().integer().min(0).max(23)
      }),
      actions: Joi.object().keys({
        sceneId: Joi.string(),
        customAction: Joi.string()
      })
    }).min(1)
  },

  deleteTrigger: {
    params: Joi.object().keys({
      triggerId: Joi.string().required()
    })
  }
};
