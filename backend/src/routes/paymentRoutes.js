const express = require('express');
const {
  createPayment,
  getPaymentsByOrder,
  getAllPayments,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createPaymentSchema } = require('../validators/paymentValidator');

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

router
  .route('/')
  .post(paymentLimiter, validate(createPaymentSchema), createPayment)
  .get(getAllPayments);

router.route('/order/:orderId').get(getPaymentsByOrder);

module.exports = router;
