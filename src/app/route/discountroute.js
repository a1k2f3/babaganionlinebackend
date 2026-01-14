import express from 'express';
const router = express.Router();

import {
  createDiscount,
  getAllDiscountsAdmin,
  validateAndGetDiscount,
  updateDiscount,
  deleteDiscount,
} from '../controller/disccountController.js';

// Middleware (you should implement these)
// import { protect, admin } from '../middleware/authMiddleware.js';

// Public routes
router.get('/code/:code',validateAndGetDiscount );               // used during checkout

// Admin only routes
// router.use(protect, admin); // protect + admin check

router.route('/')
  .post(createDiscount)
  .get(getAllDiscountsAdmin);

router.route('/:id')
  .put(updateDiscount)
  .delete(deleteDiscount);

export default router;