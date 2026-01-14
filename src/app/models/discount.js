import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema(
  {
    // === Basic Info ===
    code: {
      type: String,
      required: [true, 'Discount code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Code must be at least 3 characters'],
    },

    type: {
      type: String,
      enum: ['percentage', 'fixed'],    
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative'],
    },

    // === Usage Restrictions ===
    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null, // only meaningful for percentage
    },

    // === Date Range ===
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      default: null,
    },

    // === Usage Limits ===
    totalUsageLimit: {
      type: Number,
      min: 1,
      default: null, // null = unlimited
    },

    perCustomerLimit: {
      type: Number,
      min: 1,
      default: null, // null = unlimited per user
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    // === Target Products / Categories ===
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],

    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],

    // === Status & Metadata ===
    isActive: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // assuming you have admin/user model
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
discountSchema.index({ code: 1, isActive: 1 });
discountSchema.index({ validFrom: 1, validUntil: 1 });
discountSchema.index({ 'applicableProducts': 1 });
discountSchema.index({ 'applicableCategories': 1 });

export default mongoose.model('Discount', discountSchema);