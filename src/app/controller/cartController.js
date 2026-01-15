import Cart from "../models/Cart.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import mongoose from "mongoose";
// ➕ Add item to cart
import Product from "../models/Product.js";

export const addToCart = async (req, res) => {
  try {
    const { userId } = req.query;
    const { productId, storeId, quantity = 1, size } = req.body;

    // ── Validation ─────────────────────────────────────────────
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (!productId || !storeId) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID and Store ID are required" 
      });
    }

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(productId) || 
        !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Product or Store ID format" 
      });
    }

    // ── Find Product ───────────────────────────────────────────
    const product = await Product.findById(productId)
      .select('price discountPrice brand') // we only need these fields
      .lean();

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    if (product.brand?.toString() !== storeId) {
      return res.status(404).json({ 
        success: false, 
        message: "Product does not belong to this store" 
      });
    }

    // ── Determine effective price ──────────────────────────────
    const effectivePrice = 
      product.discountPrice && 
      product.discountPrice > 0 && 
      product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    // ── Find or create user's cart ─────────────────────────────
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
        totalDiscountedPrice: 0, // optional: track separately
      });
    }

    // ── Check if item already exists (same product + store + size) ──
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId &&
      item.storeId.toString() === storeId &&
      // Handle size comparison safely (null/undefined/empty string)
      (item.size || null) === (size || null)
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += Number(quantity);
    } else {
      // Add new item
      cart.items.push({
        productId,
        storeId,
        size: size || undefined,     // keep undefined if no size
        quantity: Number(quantity),
      });
    }

    // ── Recalculate totals ─────────────────────────────────────
    let subtotal = 0;
    let discountedTotal = 0;

    // Better approach: populate products in one query instead of loop
    const productIds = [...new Set(cart.items.map(i => i.productId))];
    const productsMap = await Product.find({ _id: { $in: productIds } })
      .select('price discountPrice')
      .lean()
      .then(docs => 
        docs.reduce((map, p) => {
          map[p._id.toString()] = p;
          return map;
        }, {})
      );

    for (const item of cart.items) {
      const prod = productsMap[item.productId.toString()];
      if (!prod) continue; // product was deleted meanwhile

      const itemPrice = prod.price || 0;
      const itemDiscountPrice = 
        prod.discountPrice && prod.discountPrice < itemPrice 
          ? prod.discountPrice 
          : itemPrice;

      subtotal += item.quantity * itemPrice;
      discountedTotal += item.quantity * itemDiscountPrice;
    }

    // You can choose which total to save
    // Option A: Save discounted price as main total (most common in e-commerce)
    // cart.totalPrice = discountedTotal;

    // Option B: Save original total + separate discount field
    cart.totalPrice = subtotal;
    cart.totalDiscount = subtotal - discountedTotal;

    await cart.save();

    // ── Response ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      cart: {
        _id: cart._id,
        items: cart.items,
        totalPrice: cart.totalPrice,
        // Optional: include more info
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      }
    });

  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding to cart",
      error: error.message
    });
  }
};




// 📜 Get user cart
export const getCart = async (req, res) => {
  try {
     const userId = req.query.userId 
    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId",
      "name  price discountPrice thumbnail brand",
    );

    if (!cart) return res.status(404).json({ message: "Cart is empty" });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update item quantity
export const updateCartItem = async (req, res) => {
  try {
     const userId = req.query.userId 
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ userId:userId  });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) return res.status(404).json({ message: "Item not in cart" });

    item.quantity = quantity;
    cart.totalPrice = await calculateTotal(cart.items);
    await cart.save();

    res.json({ message: "Cart updated", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Remove single item
export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
     const userId = req.query.userId 
    const cart = await Cart.findOne({ userId: userId });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
    cart.totalPrice = await calculateTotal(cart.items);
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧹 Clear all items
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.json({ message: "Cart cleared", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧮 Helper function to calculate total
const calculateTotal = async (items) => {
  let total = 0;
  for (const item of items) {
    const product = await Store.findById(item.productId);
    if (product) total += product.price * item.quantity;
  }
  return total;
};
