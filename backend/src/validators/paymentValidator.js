const Joi = require('joi');

const createPaymentSchema = Joi.object({
  orderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID format',
      'string.empty': 'Order ID is required',
      'any.required': 'Order ID is required',
    }),
  amount: Joi.number()
    .min(0.01)
    .max(999999999.99)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Payment amount must be a number',
      'number.min': 'Payment amount must be at least 0.01',
      'number.max': 'Payment amount is too large',
      'any.required': 'Payment amount is required',
    }),
  paymentDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Payment date must be a valid date',
      'date.format': 'Payment date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Payment date is required',
    }),
  note: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Note must not exceed 1000 characters',
    }),
  idempotencyKey: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Invalid idempotency key format',
    }),
});

module.exports = {
  createPaymentSchema,
};
