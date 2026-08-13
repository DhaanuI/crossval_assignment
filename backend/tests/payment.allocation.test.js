require('./setup');
const Payment = require('../src/models/Payment');
const Order = require('../src/models/Order');
const { createTestUser, createTestOrder } = require('./helpers/testHelpers');

describe('Payment Allocation Tests', () => {
  let user, token, order;

  beforeEach(async () => {
    // Create test user and order
    const result = await createTestUser();
    user = result.user;
    token = result.token;
    order = await createTestOrder(user._id);
  });

  test('Should allocate full payment correctly', async () => {
    // Create full payment ($1000 for $1000 order)
    const payment = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 1000,
      paymentDate: new Date(),
      note: 'Full payment',
    });

    // Update order
    order.totalPaid = 1000;
    order.hasPayments = true;
    await order.save();

    // Refresh order from database
    const updatedOrder = await Order.findById(order._id);

    // Assertions
    expect(payment.amount).toBe(1000);
    expect(updatedOrder.totalPaid).toBe(1000);
    expect(updatedOrder.amountDue).toBe(0);
    expect(updatedOrder.status).toBe('paid');
  });

  test('Should allocate partial payment correctly', async () => {
    // Create partial payment ($400 for $1000 order)
    const payment = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 400,
      paymentDate: new Date(),
      note: 'Partial payment',
    });

    // Update order
    order.totalPaid = 400;
    order.hasPayments = true;
    await order.save();

    // Refresh order from database
    const updatedOrder = await Order.findById(order._id);

    // Assertions
    expect(payment.amount).toBe(400);
    expect(updatedOrder.totalPaid).toBe(400);
    expect(updatedOrder.amountDue).toBe(600);
    expect(updatedOrder.status).toBe('partially_paid');
  });

  test('Should allocate multiple partial payments correctly', async () => {
    // First payment: $400
    const payment1 = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 400,
      paymentDate: new Date(),
    });

    order.totalPaid = 400;
    order.hasPayments = true;
    await order.save();

    // Second payment: $300
    const payment2 = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 300,
      paymentDate: new Date(),
    });

    order.totalPaid = 700;
    await order.save();

    // Third payment: $300 (completes the order)
    const payment3 = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 300,
      paymentDate: new Date(),
    });

    order.totalPaid = 1000;
    await order.save();

    // Refresh order from database
    const updatedOrder = await Order.findById(order._id);
    const payments = await Payment.find({ orderId: order._id });

    // Assertions
    expect(payments).toHaveLength(3);
    expect(payment1.amount + payment2.amount + payment3.amount).toBe(1000);
    expect(updatedOrder.totalPaid).toBe(1000);
    expect(updatedOrder.amountDue).toBe(0);
    expect(updatedOrder.status).toBe('paid');
  });

  test('Should handle exact payment to complete order', async () => {
    // First payment: $400
    order.totalPaid = 400;
    order.hasPayments = true;
    await order.save();

    // Second payment: exact remaining amount $600
    const payment = await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 600, // Exact remaining amount
      paymentDate: new Date(),
    });

    order.totalPaid = 1000;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    // Assertions
    expect(payment.amount).toBe(600);
    expect(updatedOrder.totalPaid).toBe(1000);
    expect(updatedOrder.amountDue).toBe(0);
    expect(updatedOrder.status).toBe('paid');
  });

  test('Should track payment history correctly', async () => {
    // Create multiple payments
    await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 250,
      paymentDate: new Date('2024-06-01'),
      note: 'First installment',
    });

    await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 250,
      paymentDate: new Date('2024-06-15'),
      note: 'Second installment',
    });

    await Payment.create({
      orderId: order._id,
      userId: user._id,
      amount: 500,
      paymentDate: new Date('2024-06-30'),
      note: 'Final payment',
    });

    // Get payment history
    const payments = await Payment.find({ orderId: order._id }).sort({ createdAt: 1 });

    // Assertions
    expect(payments).toHaveLength(3);
    expect(payments[0].amount).toBe(250);
    expect(payments[1].amount).toBe(250);
    expect(payments[2].amount).toBe(500);
    expect(payments[0].note).toBe('First installment');
    expect(payments[2].note).toBe('Final payment');
  });
});
