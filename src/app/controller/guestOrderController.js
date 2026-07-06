import crypto from "crypto";
import GuestOrder from "../models/GuestOrder.js"; // Adjust path to your schema file

/**
 * @desc    Create a new guest order from localCart data
 * @route   POST /api/guest-orders/checkout
 * @access  Public
 */


import mongoose from "mongoose";


export const createGuestOrder = async (req, res) => {
  try {
    console.log("=== GUEST ORDER BODY RECEIVED ===");
    console.log(JSON.stringify(req.body, null, 2));

    const {
      guestInfo,
      items,
      totalAmount,
      discountAmount,
      shippingFee,
      shippingAddress,
      paymentMethod,
    } = req.body;

    if (!guestInfo?.email || !guestInfo?.phone || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required guest details or cart items." });
    }

    // Format shippingAddress to match schema
    const formattedShippingAddress = {
      name: shippingAddress.name,
      email: guestInfo.email,
      address: `${shippingAddress.street} ${shippingAddress.apartment ? `, ${shippingAddress.apartment}` : ''}`.trim(),
      city: shippingAddress.city,
      pincode: shippingAddress.postalCode || shippingAddress.pincode,
      country: shippingAddress.country,
    };

    // FIXED: Cast storeId to ObjectId safely
    const formattedItems = items.map(item => ({
      productId: item.productId,
      storeId: item.storeId && item.storeId.length === 24 
        ? new mongoose.Types.ObjectId(item.storeId) 
        : new mongoose.Types.ObjectId("67a1b2c3d4e5f67890123456"), // Default storeId
      title: item.title || item.name,
      image: item.image,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    const newGuestOrder = new GuestOrder({
      guestInfo,
      items: formattedItems,
      totalAmount: Number(totalAmount),
      discountAmount: Number(discountAmount || 0),
      shippingFee: Number(shippingFee || 0),
      shippingAddress: formattedShippingAddress,
      paymentMethod: paymentMethod || "Cash on Delivery",
      trackingToken: crypto.randomBytes(16).toString("hex"),
    });

    const savedOrder = await newGuestOrder.save();

    res.status(201).json({
      success: true,
      message: "Guest order placed successfully!",
      orderId: savedOrder._id,
      trackingToken: savedOrder.trackingToken,
      order: savedOrder,
    });
  } catch (error) {
    console.error("Guest Order Error:", error);
    res.status(500).json({
      message: "Server error placing guest order.",
      error: error.message,
      validationErrors: error.errors
    });
  }
};

/**
 * @desc    Get order details using the unique tracking token
 * @route   GET /api/guest-orders/track/:token
 * @access  Public
 */
export const getGuestOrderDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const order = await GuestOrder.findOne({ trackingToken: token })
      .populate("items.productId", "title price")
      .populate("items.storeId", "name");

    if (!order) {
      return res.status(404).json({ message: "No order found with this tracking link." });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: "Server error tracking order.", error: error.message });
  }
};

/**
 * @desc    Update order or payment status (Admin/Store manager use)
 * @route   PUT /api/guest-orders/:id/status
 * @access  Private / Protected
 */
export const updateGuestOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updatedFields = {};
    if (status) updatedFields.status = status;
    if (paymentStatus) updatedFields.paymentStatus = paymentStatus;

    const updatedOrder = await GuestOrder.findByIdAndUpdate(
      id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Guest order not found." });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error updating order.", error: error.message });
  }
};
/**
 * @desc    Get all guest orders (Admin/Dashboard view)
 * @route   GET /api/guest-orders
 * @access  Private / Admin
 */
export const getAllGuestOrders = async (req, res) => {
  try {
    // Optional pagination queries (defaults to page 1, 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch orders sorted by the newest first
    const orders = await GuestOrder.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.productId", "title price")
      .populate("items.storeId", "name");

    // Get total count for frontend pagination calculations
    const totalOrders = await GuestOrder.countDocuments();

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        totalOrders,
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
      },
      orders,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error retrieving guest orders.", 
      error: error.message 
    });
  }
};