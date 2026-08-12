const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be at least 0.01'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Allow null values, but enforce uniqueness for non-null
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
