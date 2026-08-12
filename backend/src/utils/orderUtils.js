/**
 * Calculate subtotal from line items
 */
const calculateSubtotal = (lineItems) => {
  return lineItems.reduce((total, item) => {
    return total + item.quantity * item.unitPrice;
  }, 0);
};

/**
 * Calculate order total (for now, same as subtotal - no tax/discount)
 */
const calculateOrderTotal = (subtotal) => {
  return subtotal;
};

/**
 * Validate line items
 */
const validateLineItems = (lineItems) => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { valid: false, error: 'At least one line item is required' };
  }

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];

    if (!item.description || item.description.trim() === '') {
      return {
        valid: false,
        error: `Line item ${i + 1}: Description is required`,
      };
    }

    if (!item.quantity || item.quantity < 1) {
      return {
        valid: false,
        error: `Line item ${i + 1}: Quantity must be at least 1`,
      };
    }

    if (item.unitPrice === undefined || item.unitPrice < 0) {
      return {
        valid: false,
        error: `Line item ${i + 1}: Unit price cannot be negative`,
      };
    }
  }

  return { valid: true };
};

module.exports = {
  calculateSubtotal,
  calculateOrderTotal,
  validateLineItems,
};
