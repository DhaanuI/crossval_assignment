const Order = require('../models/Order');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const {
  calculateSubtotal,
  calculateOrderTotal,
  validateLineItems,
} = require('../utils/orderUtils');
const { createOrderSchema, updateOrderSchema } = require('../validators/orderValidator');
const { paginateItems } = require('../utils/pagination');

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = async (req, res) => {
  let session;

  try {
    const { customer, dueDate, lineItems } = req.body;

    // Validation with Joi
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // EDGE CASE: Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date format',
      });
    }

    // Validate line items (additional business logic)
    const lineItemValidation = validateLineItems(lineItems);
    if (!lineItemValidation.valid) {
      return res.status(400).json({
        success: false,
        message: lineItemValidation.error,
      });
    }

    // EDGE CASE: Check for duplicate line item descriptions
    const descriptions = lineItems.map(item => item.description.toLowerCase().trim());
    const uniqueDescriptions = new Set(descriptions);
    if (descriptions.length !== uniqueDescriptions.size) {
      console.log('Warning: Order has duplicate line item descriptions');
      // This is just a warning, not blocking
    }

    // Calculate totals with precision handling
    const subtotal = calculateSubtotal(lineItems);
    const orderTotal = calculateOrderTotal(subtotal);

    // EDGE CASE: Check for unreasonably large totals
    if (orderTotal > 999999999.99) {
      return res.status(400).json({
        success: false,
        message: 'Order total exceeds maximum allowed value',
      });
    }

    // EDGE CASE: Check for zero-value orders
    if (orderTotal === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order total must be greater than zero',
      });
    }

    // ACID TRANSACTION: Create order atomically
    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.create(
      [
        {
          userId: req.user._id,
          customer: customer.trim(),
          dueDate: dueDateObj,
          lineItems,
          subtotal: Math.round(subtotal * 100) / 100,
          orderTotal: Math.round(orderTotal * 100) / 100,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    console.log(`Order created: ${order[0]._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: order[0] },
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    console.error('Create order error:', error);

    res.status(500).json({
      success: false,
      message: 'Error creating order. Please try again later.',
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * @desc    Get all orders for logged-in user
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const orders = await Order.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    const filteredOrders = status
      ? orders.filter((order) => order.status === status)
      : orders;

    const { items, pagination } = paginateItems(filteredOrders, req.query);
    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.orderTotal, 0),
      collected: orders.reduce((sum, order) => sum + order.totalPaid, 0),
      outstanding: orders.reduce((sum, order) => sum + order.amountDue, 0),
    };

    res.status(200).json({
      success: true,
      count: items.length,
      pagination,
      data: {
        orders: items,
        summary,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
    });
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get payment history for this order
    const payments = await Payment.find({ orderId: order._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: {
        order,
        payments,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
    });
  }
};

/**
 * @desc    Update order
 * @route   PUT /api/orders/:id
 * @access  Private
 */
const updateOrder = async (req, res) => {
  let session;

  try {
    // EDGE CASE: Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
      });
    }

    // Validation with Joi
    const { error } = updateOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // ACID TRANSACTION for update
    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).session(session);

    // EDGE CASE: Order not found or doesn't belong to user
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to edit this order',
      });
    }

    // Check if order has payments (making it read-only)
    if (order.hasPayments) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'Cannot edit order after payments have been recorded. Orders become read-only after the first payment.',
        reason: 'data_integrity',
      });
    }

    const { customer, dueDate, lineItems } = req.body;

    // Update fields if provided
    if (customer) {
      order.customer = customer.trim();
    }

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format',
        });
      }
      order.dueDate = dueDateObj;
    }

    if (lineItems) {
      // Validate line items
      const lineItemValidation = validateLineItems(lineItems);
      if (!lineItemValidation.valid) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: lineItemValidation.error,
        });
      }

      order.lineItems = lineItems;
      const subtotal = calculateSubtotal(lineItems);
      const orderTotal = calculateOrderTotal(subtotal);

      // EDGE CASE: Check for unreasonably large totals
      if (orderTotal > 999999999.99) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Order total exceeds maximum allowed value',
        });
      }

      // EDGE CASE: Check for zero-value orders
      if (orderTotal === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Order total must be greater than zero',
        });
      }

      order.subtotal = Math.round(subtotal * 100) / 100;
      order.orderTotal = Math.round(orderTotal * 100) / 100;
    }

    await order.save({ session });
    await session.commitTransaction();

    console.log(`Order updated: ${order._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: { order },
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    console.error('Update order error:', error);

    res.status(500).json({
      success: false,
      message: 'Error updating order. Please try again later.',
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * @desc    Delete order
 * @route   DELETE /api/orders/:id
 * @access  Private
 */
const deleteOrder = async (req, res) => {
  let session;

  try {
    // EDGE CASE: Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format',
      });
    }

    // ACID TRANSACTION for delete
    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).session(session);

    // EDGE CASE: Order not found or doesn't belong to user
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to delete this order',
      });
    }

    // Check if order has payments
    if (order.hasPayments) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete order with payment history. Orders with payments are read-only.',
        reason: 'data_integrity',
      });
    }

    // EDGE CASE: Double-check no payments exist (race condition protection)
    const paymentCount = await Payment.countDocuments({ orderId: order._id }).session(session);
    if (paymentCount > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete order with existing payments',
      });
    }

    await Order.deleteOne({ _id: order._id }, { session });
    await session.commitTransaction();

    console.log(`Order deleted: ${order._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    console.error('Delete order error:', error);

    res.status(500).json({
      success: false,
      message: 'Error deleting order. Please try again later.',
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const toUtcDayStart = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const toUtcDayEnd = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const exportOrders = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide from and to dates (YYYY-MM-DD)',
      });
    }

    const fromDate = toUtcDayStart(from);
    const toDate = toUtcDayEnd(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range',
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: 'From date cannot be after to date',
      });
    }

    const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
    if (toDate - fromDate > maxRangeMs) {
      return res.status(400).json({
        success: false,
        message: 'Export range cannot be longer than 90 days',
      });
    }

    const filter = {
      userId: req.user._id,
      createdAt: { $gte: fromDate, $lte: toDate },
    };
    const maxRows = 1000;
    const total = await Order.countDocuments(filter);

    if (total > maxRows) {
      return res.status(400).json({
        success: false,
        message: `Too many orders in this range (${total}). Narrow the dates to 1000 or fewer.`,
      });
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    const header = [
      'Customer',
      'Status',
      'Order Total',
      'Amount Paid',
      'Amount Due',
      'Due Date',
      'Created At',
    ];

    const rows = orders.map((order) => [
      csvEscape(order.customer),
      order.status,
      order.orderTotal.toFixed(2),
      order.totalPaid.toFixed(2),
      order.amountDue.toFixed(2),
      order.dueDate.toISOString().slice(0, 10),
      order.createdAt.toISOString().slice(0, 10),
    ]);

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const filename = `orders-${from}-to-${to}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting orders',
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  exportOrders,
};
