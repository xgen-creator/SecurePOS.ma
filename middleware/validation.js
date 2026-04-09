const { body, validationResult } = require('express-validator');

const phoneValidation = [
  body('phoneNumber')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format. Must start with + and contain 1-15 digits'),
];

const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format'),
];

const codeValidation = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Code must be 6 digits'),
];

const validate = (type) => {
  switch (type) {
    case 'phone':
      return [...phoneValidation, validateResults];
    case 'email':
      return [...emailValidation, validateResults];
    case 'code':
      return [...codeValidation, validateResults];
    default:
      return [validateResults];
  }
};

const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validate,
  phoneValidation,
  emailValidation,
  codeValidation,
};
