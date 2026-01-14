import mongoose from 'mongoose';
import Discount from '../models/Discount.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js'; // ← assume you have this

/**
 * Create new discount - Admin only
 */
export const createDiscount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      code,
      type,
      value,
      minOrderAmount = 0,
      maxDiscountAmount,
      validFrom,
      validUntil,
      totalUsageLimit,
      perCustomerLimit,
      applicableProducts = [],
      applicableCategories = [],
      description,
      isActive = true,
    } = req.body;

    // ── Basic validation ─────────────────────────────────────
    if (!code?.trim()) throw new Error('Discount code is required');
    if (!['percentage', 'fixed'].includes(type))
      throw new Error('Invalid discount type');
    if (typeof value !== 'number' || value <= 0)
      throw new Error('Discount value must be positive number');
    if (type === 'percentage' && value > 100)
      throw new Error('Percentage discount cannot exceed 100%');

    if (minOrderAmount < 0) throw new Error('Minimum order amount cannot be negative');
    if (maxDiscountAmount !== undefined && maxDiscountAmount <= 0)
      throw new Error('Max discount amount must be positive');

    // Check referenced products exist
    if (applicableProducts.length > 0) {
      const validProducts = await Product.countDocuments({
        _id: { $in: applicableProducts },
      });
      if (validProducts !== applicableProducts.length) {
        throw new Error('One or more selected products do not exist');
      }
    }

    // Check referenced categories exist
    if (applicableCategories.length > 0) {
      const validCategories = await Category.countDocuments({
        _id: { $in: applicableCategories },
      });
      if (validCategories !== applicableCategories.length) {
        throw new Error('One or more selected categories do not exist');
      }
    }

    const discount = new Discount({
      code: code.trim().toUpperCase(),
      type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      totalUsageLimit,
      perCustomerLimit,
      applicableProducts,
      applicableCategories,
      description,
      isActive,
      createdBy: req.user._id,
    });

    await discount.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Discount created successfully',
      data: discount,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create discount',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get discount by code - Used during checkout (public)
 */
export const validateAndGetDiscount = async (req, res) => {
  try {
    const { code } = req.params;
    const normalizedCode = code.trim().toUpperCase();

    const now = new Date();

    const discount = await Discount.findOne({
      code: normalizedCode,
      isActive: true,
      validFrom: { $lte: now },
      $or: [{ validUntil: { $gte: now } }, { validUntil: null }],
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired discount code',
      });
    }

    // Check global usage limit
    if (discount.totalUsageLimit && discount.usedCount >= discount.totalUsageLimit) {
      return res.status(410).json({
        success: false,
        message: 'This discount has reached its usage limit',
      });
    }

    res.json({
      success: true,
      data: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        minOrderAmount: discount.minOrderAmount,
        maxDiscountAmount: discount.maxDiscountAmount,
        applicableProducts: discount.applicableProducts,
        applicableCategories: discount.applicableCategories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating discount',
      error: error.message,
    });
  }
};

/**
 * Apply discount usage (called after successful order)
 * → Should be called in transaction from order controller
 */
export const incrementDiscountUsage = async (discountId, session = null) => {
  const opts = session ? { session } : {};

  const discount = await Discount.findByIdAndUpdate(
    discountId,
    { $inc: { usedCount: 1 } },
    { new: true, ...opts }
  );

  if (!discount) throw new Error('Discount not found');

  return discount;
};

/**
 * Get all discounts - Admin panel
 */
export const getAllDiscountsAdmin = async (req, res) => {
  try {
    const { active, expired, search } = req.query;

    const filter = {};

    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    if (expired === 'true') {
      filter.validUntil = { $lt: new Date() };
    } else if (expired === 'false') {
      filter.$or = [{ validUntil: { $gte: new Date() } }, { validUntil: null }];
    }

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const discounts = await Discount.find(filter)
      .populate('applicableProducts', 'name price discountPrice sku')
      .populate('applicableCategories', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: discounts.length,
      data: discounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching discounts',
      error: error.message,
    });
  }
};

// Update & Delete remain similar, but add transaction + better validation if needed

export const updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    res.json({
      success: true,
      message: 'Discount updated',
      data: discount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update discount',
    });
  }
};

export const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    res.json({
      success: true,
      message: 'Discount permanently deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete discount',
      error: error.message,
    });
  }
};