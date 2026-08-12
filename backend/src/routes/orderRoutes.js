const express = require('express');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { orderCreationLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createOrderSchema, updateOrderSchema } = require('../validators/orderValidator');

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

router
  .route('/')
  .post(orderCreationLimiter, validate(createOrderSchema), createOrder)
  .get(getOrders);

router
  .route('/:id')
  .get(getOrderById)
  .put(validate(updateOrderSchema), updateOrder)
  .delete(deleteOrder);

module.exports = router;
