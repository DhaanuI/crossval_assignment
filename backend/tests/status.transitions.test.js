require('./setup');
const Order = require('../src/models/Order');
const { createTestUser, createTestOrder } = require('./helpers/testHelpers');

describe('Order Status Transition Tests', () => {
  let user;

  beforeEach(async () => {
    const result = await createTestUser();
    user = result.user;
  });

  test('Should start with PENDING status when no payments', async () => {
    const order = await createTestOrder(user._id);

    expect(order.totalPaid).toBe(0);
    expect(order.amountDue).toBe(1000);
    expect(order.status).toBe('pending');
  });

  test('Should transition from PENDING to PARTIALLY_PAID', async () => {
    const order = await createTestOrder(user._id);

    // Add partial payment
    order.totalPaid = 400;
    order.hasPayments = true;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    expect(updatedOrder.status).toBe('partially_paid');
    expect(updatedOrder.amountDue).toBe(600);
  });

  test('Should transition from PARTIALLY_PAID to PAID', async () => {
    const order = await createTestOrder(user._id);

    // Add first partial payment
    order.totalPaid = 400;
    order.hasPayments = true;
    await order.save();

    let updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('partially_paid');

    // Add second payment to complete
    order.totalPaid = 1000;
    await order.save();

    updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.amountDue).toBe(0);
  });

  test('Should transition from PENDING to PAID (full payment)', async () => {
    const order = await createTestOrder(user._id);

    // Add full payment at once
    order.totalPaid = 1000;
    order.hasPayments = true;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.amountDue).toBe(0);
  });

  test('Should show OVERDUE status when past due date and not paid', async () => {
    // Create order with past due date
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const order = await createTestOrder(user._id, { dueDate: pastDate });

    expect(order.status).toBe('overdue');
  });

  test('Should show OVERDUE status when past due date and partially paid', async () => {
    // Create order with past due date
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const order = await createTestOrder(user._id, { dueDate: pastDate });

    // Add partial payment
    order.totalPaid = 500;
    order.hasPayments = true;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    expect(updatedOrder.status).toBe('overdue');
    expect(updatedOrder.totalPaid).toBe(500);
  });

  test('Should transition from OVERDUE to PAID when fully paid (Option A)', async () => {
    // Create overdue order
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const order = await createTestOrder(user._id, { dueDate: pastDate });

    expect(order.status).toBe('overdue');

    // Pay in full
    order.totalPaid = 1000;
    order.hasPayments = true;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    // IMPORTANT: Status should be 'paid' (Option A)
    // Payment complete takes priority over being overdue
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.amountDue).toBe(0);
  });

  test('Should maintain PENDING status before due date with no payments', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days future
    const order = await createTestOrder(user._id, { dueDate: futureDate });

    expect(order.status).toBe('pending');
  });

  test('Should maintain PARTIALLY_PAID status before due date', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const order = await createTestOrder(user._id, { dueDate: futureDate });

    order.totalPaid = 500;
    order.hasPayments = true;
    await order.save();

    const updatedOrder = await Order.findById(order._id);

    expect(updatedOrder.status).toBe('partially_paid');
  });

  test('Status derivation priority: PAID > OVERDUE > PARTIALLY_PAID > PENDING', async () => {
    // Test 1: Paid takes priority over overdue
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const order1 = await createTestOrder(user._id, { dueDate: pastDate });
    order1.totalPaid = 1000;
    order1.hasPayments = true;
    await order1.save();

    const updated1 = await Order.findById(order1._id);
    expect(updated1.status).toBe('paid'); // Not 'overdue'

    // Test 2: Overdue takes priority over partially_paid
    const order2 = await createTestOrder(user._id, { dueDate: pastDate });
    order2.totalPaid = 500;
    order2.hasPayments = true;
    await order2.save();

    const updated2 = await Order.findById(order2._id);
    expect(updated2.status).toBe('overdue'); // Not 'partially_paid'

    // Test 3: Partially_paid takes priority over pending
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const order3 = await createTestOrder(user._id, { dueDate: futureDate });
    order3.totalPaid = 100;
    order3.hasPayments = true;
    await order3.save();

    const updated3 = await Order.findById(order3._id);
    expect(updated3.status).toBe('partially_paid'); // Not 'pending'
  });
});
