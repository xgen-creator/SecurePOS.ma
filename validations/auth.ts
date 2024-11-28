import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const registrationSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  
  email: Joi.string()
    .email()
    .required(),
  
  password: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*]{6,30}$'))
    .required()
    .messages({
      'string.pattern.base': 'Password must be between 6-30 characters and may contain special characters'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  
  password: Joi.string()
    .required()
});

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { error } = registrationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { error } = loginSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }

  next();
};
