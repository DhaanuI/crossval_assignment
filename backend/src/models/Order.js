const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'At least one line item is required',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasPayments: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for amount due
orderSchema.virtual('amountDue').get(function () {
  return this.orderTotal - this.totalPaid;
});

// Virtual field for status
orderSchema.virtual('status').get(function () {
  // Priority 1: If fully paid, status is "paid"
  if (this.totalPaid >= this.orderTotal) {
    return 'paid';
  }
  
  // Priority 2: If past due date and not fully paid, status is "overdue"
  const now = new Date();
  if (now > this.dueDate) {
    return 'overdue';
  }
  
  // Priority 3: If some payment but not full, status is "partially_paid"
  if (this.totalPaid > 0) {
    return 'partially_paid';
  }
  
  // Default: No payments, status is "pending"
  return 'pending';
});

// Ensure virtuals are included in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

// Index for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Order', orderSchema);
