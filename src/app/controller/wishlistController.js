import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

/**
 * Get the wishlist of a user
 */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.params.userId;

    let wishlist = await Wishlist.findOne({ user: userId })
      .populate("products.product", "name price images thumbnail") // populate product info
      .lean();

    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    res.json({ success: true, data: wishlist });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add a product to user's wishlist
 */
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { productId } = req.body;

    // Check if product exists
    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Create wishlist if it doesn't exist
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    // Check if product already in wishlist
    const alreadyAdded = wishlist.products.some(
      (p) => p.product.toString() === productId
    );
    if (alreadyAdded) {
      return res.status(400).json({ success: false, message: "Product already in wishlist" });
    }

    // Add product
    wishlist.products.push({ product: productId });
    await wishlist.save();

    res.status(201).json({ success: true, message: "Product added to wishlist", data: wishlist });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Remove a product from user's wishlist
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { productId } = req.body;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    // Filter out the product
    wishlist.products = wishlist.products.filter(
      (p) => p.product.toString() !== productId
    );
    await wishlist.save();

    res.json({ success: true, message: "Product removed from wishlist", data: wishlist });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
