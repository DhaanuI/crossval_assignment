const User = require('../../src/models/User');
const Order = require('../../src/models/Order');
const { generateToken } = require('../../src/utils/tokenUtils');

/**
 * Create a test user and return user + token
 */
const createTestUser = async (email = 'test@example.com', password = 'Test123!@#') => {
  const user = await User.create({ email, password });
  const token = generateToken(user._id);
  return { user, token };
};

/**
 * Create a test order
 */
const createTestOrder = async (userId, orderData = {}) => {
  const defaultOrder = {
    userId,
    customer: 'Test Customer',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    lineItems: [
      {
        description: 'Test Item',
        quantity: 2,
        unitPrice: 500,
      },
    ],
    subtotal: 1000,
    orderTotal: 1000,
  };

  const order = await Order.create({ ...defaultOrder, ...orderData });
  return order;
};

/**
 * Wait for a specified time (for concurrency tests)
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  createTestUser,
  createTestOrder,
  wait,
};
