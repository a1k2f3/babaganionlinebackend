import Review from "../models/Review.js";
import mongoose from 'mongoose'; // adjust path
import Product from '../models/Product.js'
export const createReview = async (req, res) => {
  try {
    const { product, user, rating, comment } = req.body;

    // 1. Basic validation
    if (!product || !user || !rating) {
      return res.status(400).json({
        message: "Product ID, User ID and rating are required"
      });
    }

    // 2. Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(user)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // 3. Optional: Check if product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 4. Check for duplicate review
    const existingReview = await Review.findOne({ product, user });
    if (existingReview) {
      return res.status(409).json({
        message: "You have already reviewed this product"
      });
    }

    // 5. Validate rating range (extra safety)
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5"
      });
    }

    // 6. Create and save review
    const review = new Review({
      product,
      user,
      rating,
      comment: comment?.trim() || undefined,
    });

    const savedReview = await review.save();

    // Optional: Update product's average rating (if you want)
    // await updateProductRating(product);

    res.status(201).json({
      message: "Review added successfully",
      review: savedReview,
    });

  } catch (err) {
    console.error('Create Review Error:', err); // ← log for debugging

    // Handle specific Mongoose errors
    if (err.name === 'CastError') {
      return res.status(400).json({
        message: `Invalid ID format for field: ${err.path}`,
        value: err.value,
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    // Generic error
    res.status(500).json({
      message: "Failed to add review",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate("product user");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate("product user");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Optional: validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid product ID" 
      });
    }

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name email') // optional: bring user info
      .sort({ createdAt: -1 })        // newest first
      .lean();                        // faster if you don't need mongoose documents

    // Optional: calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: averageRating.toFixed(1),
      reviews
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching reviews",
      error: error.message
    });
  }
};