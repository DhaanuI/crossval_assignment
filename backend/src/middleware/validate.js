const getResolutionHint = (detail) => {
  const field = detail.path.join('.') || 'this field';
  const type = detail.type || '';

  if (type.includes('required') || type.includes('empty')) {
    return `Add a value for ${field}.`;
  }
  if (type.includes('min') || type.includes('less')) {
    return `Increase ${field} so it meets the minimum.`;
  }
  if (type.includes('max') || type.includes('greater')) {
    return `Reduce ${field} so it stays within the allowed limit.`;
  }
  if (type.includes('email') || field === 'email') {
    return 'Use a valid email such as name@company.com.';
  }
  if (field.includes('password')) {
    return 'Use at least 8 characters with upper, lower, number, and a special character.';
  }
  if (field.includes('Date')) {
    return 'Use YYYY-MM-DD, and keep the date on or before today.';
  }
  if (type.includes('number') || type.includes('integer')) {
    return `Enter a valid number for ${field}.`;
  }

  return `Check ${field} and try again.`;
};

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errorMessages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        hint: getResolutionHint(detail),
      }));

      return res.status(400).json({
        success: false,
        message: errorMessages[0]?.message || 'Validation failed',
        hint: errorMessages[0]?.hint,
        errors: errorMessages,
      });
    }

    // Replace req.body with sanitized/validated value
    req.body = value;
    next();
  };
};

module.exports = validate;
