require('./setup');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Payment = require('../src/models/Payment');
const Order = require('../src/models/Order');
const { createTestUser, createTestOrder } = require('./helpers/testHelpers');
const { createPayment } = require('../src/controllers/paymentController');
const { protect } = require('../src/middleware/auth');

// Create minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/api/payments', protect, createPayment);
  return app;
};

describe('Overpayment Rejection Tests', () => {
  let user, token, order, app;

  beforeEach(async () => {
    const result = await createTestUser();
    user = result.user;
    token = result.token;
    order = await createTestOrder(user._id);
    app = createTestApp();
  });

  test('Should reject overpayment on first payment attempt', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 1500, // More than order total of $1000
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('exceeds the remaining balance');
    expect(response.body.maxAllowedAmount).toBe(1000);
  });

  test('Should reject overpayment on second payment attempt', async () => {
    // First payment: $600
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 600,
        paymentDate: new Date().toISOString(),
      });

    // Second payment: $500 (would total $1100, exceeds $1000)
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 500,
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('exceeds the remaining balance');
    expect(response.body.maxAllowedAmount).toBe(400); // Only $400 remaining
  });

  test('Should provide exact maximum allowed amount in error', async () => {
    // Partial payment: $750
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 750,
        paymentDate: new Date().toISOString(),
      });

    // Try to pay $300 (would exceed by $50)
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 300,
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.maxAllowedAmount).toBe(250);
    expect(response.body.message).toContain('$250.00');
  });

  test('Should reject payment when order is already fully paid', async () => {
    // Pay full amount
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 1000,
        paymentDate: new Date().toISOString(),
      });

    // Try to pay $1 more
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 1,
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('already fully paid');
  });

  test('Should accept payment equal to exact remaining amount', async () => {
    // First payment: $400
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 400,
        paymentDate: new Date().toISOString(),
      });

    // Second payment: exact remaining $600
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 600,
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.totalPaid).toBe(1000);
    expect(updatedOrder.status).toBe('paid');
  });

  test('Should handle floating point precision in overpayment check', async () => {
    // Create order with total that might cause floating point issues
    const specialOrder = await createTestOrder(user._id, {
      lineItems: [
        {
          description: 'Item 1',
          quantity: 3,
          unitPrice: 33.33,
        },
      ],
      subtotal: 99.99,
      orderTotal: 99.99,
    });

    // Pay most of it
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: specialOrder._id.toString(),
        amount: 66.66,
        paymentDate: new Date().toISOString(),
      });

    // Try to overpay slightly
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: specialOrder._id.toString(),
        amount: 33.34, // Would exceed by $0.01
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('exceeds the remaining balance');
  });

  test('Should provide order details in overpayment error', async () => {
    // Partial payment
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 300,
        paymentDate: new Date().toISOString(),
      });

    // Try to overpay
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id.toString(),
        amount: 800,
        paymentDate: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.orderDetails).toBeDefined();
    expect(response.body.orderDetails.orderTotal).toBe(1000);
    expect(response.body.orderDetails.totalPaid).toBe(300);
    expect(response.body.orderDetails.amountDue).toBe(700);
  });
});
