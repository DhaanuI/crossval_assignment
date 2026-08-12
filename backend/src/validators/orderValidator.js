const Joi = require('joi');

const lineItemSchema = Joi.object({
  description: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Line item description is required',
      'string.min': 'Description must not be empty',
      'string.max': 'Description must not exceed 500 characters',
      'any.required': 'Line item description is required',
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(1000000)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity must not exceed 1,000,000',
      'any.required': 'Quantity is required',
    }),
  unitPrice: Joi.number()
    .min(0)
    .max(999999999.99)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Unit price must be a number',
      'number.min': 'Unit price cannot be negative',
      'number.max': 'Unit price is too large',
      'any.required': 'Unit price is required',
    }),
});

const createOrderSchema = Joi.object({
  customer: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Customer name is required',
      'string.min': 'Customer name must not be empty',
      'string.max': 'Customer name must not exceed 255 characters',
      'any.required': 'Customer name is required',
    }),
  dueDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Due date must be a valid date',
      'date.format': 'Due date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Due date is required',
    }),
  lineItems: Joi.array()
    .items(lineItemSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one line item is required',
      'array.max': 'Cannot exceed 100 line items',
      'any.required': 'Line items are required',
    }),
});

const updateOrderSchema = Joi.object({
  customer: Joi.string().trim().min(1).max(255).optional(),
  dueDate: Joi.date().iso().optional(),
  lineItems: Joi.array().items(lineItemSchema).min(1).max(100).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
};
