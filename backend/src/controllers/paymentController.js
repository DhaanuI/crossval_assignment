const Payment = require('../models/Payment');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { createPaymentSchema } = require('../validators/paymentValidator');

/**
 * @desc    Record a payment against an order
 * @route   POST /api/payments
 * @access  Private
 */
const createPayment = async (req, res) => {
  let session;

  try {
    let { orderId, amount, paymentDate, note, idempotencyKey } = req.body;

    // Validation with Joi
    const { error } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // IDEMPOTENCY: Generate or use provided idempotency key
    if (!idempotencyKey) {
      idempotencyKey = uuidv4();
    }

    // IDEMPOTENCY CHECK: Check if payment with this idempotency key already exists
    const existingPayment = await Payment.findOne({ idempotencyKey }).populate('orderId');
    if (existingPayment) {
      console.log(`Idempotent payment request detected: ${idempotencyKey}`);

      // Return the existing payment (idempotent response)
      return res.status(200).json({
        success: true,
        message: 'Payment was already recorded (idempotent request)',
        data: {
          payment: existingPayment,
          order: {
            id: existingPayment.orderId._id,
            orderTotal: existingPayment.orderId.orderTotal,
            totalPaid: existingPayment.orderId.totalPaid,
            amountDue: existingPayment.orderId.amountDue,
            status: existingPayment.orderId.status,
          },
        },
      });
    }

    // EDGE CASE: Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
      });
    }

    // EDGE CASE: Validate amount precision (2 decimal places)
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount !== amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must have at most 2 decimal places',
      });
    }

    // EDGE CASE: Check for extremely large amounts
    if (amount > 999999999.99) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds maximum allowed value',
      });
    }

    // Start MongoDB transaction for ACID compliance
    session = await mongoose.startSession();
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 30000, // 30 second timeout
    });

    // RACE CONDITION FIX: Find order with session lock
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    }).session(session);

    // EDGE CASE: Order not found or doesn't belong to user
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to add payments to this order',
      });
    }

    // EDGE CASE: Check if order is already fully paid
    if (order.totalPaid >= order.orderTotal) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Order is already fully paid. No additional payment needed.',
        currentStatus: {
          orderTotal: order.orderTotal,
          totalPaid: order.totalPaid,
          amountDue: 0,
        },
      });
    }

    // Calculate remaining amount with precision
    const amountDue = Math.round((order.orderTotal - order.totalPaid) * 100) / 100;

    // EDGE CASE: Handle floating point precision issues
    const effectiveAmount = Math.min(roundedAmount, amountDue);

    // Check for overpayment (with tolerance for floating point errors)
    if (roundedAmount > amountDue + 0.001) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${roundedAmount.toFixed(
          2
        )}) exceeds the remaining balance. Maximum allowed payment: $${amountDue.toFixed(2)}`,
        maxAllowedAmount: amountDue,
        orderDetails: {
          orderTotal: order.orderTotal,
          totalPaid: order.totalPaid,
          amountDue: amountDue,
        },
      });
    }

    // EDGE CASE: Validate payment date
    const paymentDateObj = new Date(paymentDate);
    if (isNaN(paymentDateObj.getTime())) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid payment date format',
      });
    }

    // EDGE CASE: Payment date in the future
    if (paymentDateObj > new Date()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment date cannot be in the future',
      });
    }

    // EDGE CASE: Payment date before order creation
    if (paymentDateObj < order.createdAt) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment date cannot be before order creation date',
      });
    }

    // Create payment with idempotency key
    const payment = await Payment.create(
      [
        {
          orderId,
          userId: req.user._id,
          amount: effectiveAmount,
          paymentDate: paymentDateObj,
          note: note || '',
          idempotencyKey,
        },
      ],
      { session }
    );

    // Update order's totalPaid and hasPayments flag atomically
    const newTotalPaid = Math.round((order.totalPaid + effectiveAmount) * 100) / 100;
    order.totalPaid = newTotalPaid;
    order.hasPayments = true;

    await order.save({ session });

    // Commit transaction (ACID)
    await session.commitTransaction();

    console.log(`Payment recorded: ${effectiveAmount} for order ${orderId} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment: payment[0],
        order: {
          id: order._id,
          orderTotal: order.orderTotal,
          totalPaid: order.totalPaid,
          amountDue: order.amountDue,
          status: order.status,
        },
        idempotencyKey, // Return for client to cache
      },
    });
  } catch (error) {
    // Rollback transaction on any error
    if (session) {
      await session.abortTransaction();
    }

    console.error('Create payment error:', error);

    // EDGE CASE: Handle duplicate idempotency key (race condition)
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      // Another request with same idempotency key succeeded first
      const existingPayment = await Payment.findOne({
        idempotencyKey: req.body.idempotencyKey
      }).populate('orderId');

      if (existingPayment) {
        return res.status(200).json({
          success: true,
          message: 'Payment was already recorded (concurrent request handled)',
          data: {
            payment: existingPayment,
            order: {
              id: existingPayment.orderId._id,
              orderTotal: existingPayment.orderId.orderTotal,
              totalPaid: existingPayment.orderId.totalPaid,
              amountDue: existingPayment.orderId.amountDue,
              status: existingPayment.orderId.status,
            },
          },
        });
      }
    }

    // EDGE CASE: Transaction timeout
    if (error.name === 'MongoServerError' && error.code === 50) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing timed out. Please try again.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error recording payment. Please try again later.',
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * @desc    Get all payments for a specific order
 * @route   GET /api/payments/order/:orderId
 * @access  Private
 */
const getPaymentsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order belongs to user
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get payments
    const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: { payments },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
    });
  }
};

/**
 * @desc    Get all payments for logged-in user
 * @route   GET /api/payments
 * @access  Private
 */
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('orderId', 'customer orderTotal')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: { payments },
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
    });
  }
};

module.exports = {
  createPayment,
  getPaymentsByOrder,
  getAllPayments,
};
