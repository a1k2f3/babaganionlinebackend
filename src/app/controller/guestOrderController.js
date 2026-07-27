import crypto from "crypto";
import GuestOrder from "../models/GuestOrder.js"; // Adjust path to your schema file
import { sendGuestThankYouEmail, sendNewOrderNotificationToAdmin } from '../utils/emailService.js';
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

    // Validation
    if (!guestInfo?.email || !guestInfo?.phone || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required guest details or cart items." 
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({ 
        success: false,
        message: "Shipping address is required." 
      });
    }

    // Format shipping address
    const formattedShippingAddress = {
      name: shippingAddress.name || `${guestInfo.firstName || ''} ${guestInfo.lastName || ''}`.trim(),
      email: guestInfo.email,
      address: `${shippingAddress.street || ''} ${shippingAddress.apartment ? `, ${shippingAddress.apartment}` : ''}`.trim(),
      city: shippingAddress.city,
      pincode: shippingAddress.postalCode || shippingAddress.pincode,
      country: shippingAddress.country || 'India',
    };

    // Format items with better ObjectId handling
    const formattedItems = items.map(item => ({
      productId: new mongoose.Types.ObjectId(item.productId),
      storeId: item.storeId && /^[0-9a-fA-F]{24}$/.test(item.storeId)
        ? new mongoose.Types.ObjectId(item.storeId)
        : new mongoose.Types.ObjectId("67a1b2c3d4e5f67890123456"), // Default storeId
      title: item.title || item.name,
      image: item.image,
      size: item.size,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    // Create and save order first
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

    console.log(`Guest order created successfully: ${savedOrder._id}`);

    // ==================== SEND EMAILS (Background) ====================
    
    // Fire and forget - prevents timeout issues
    Promise.all([
      sendGuestThankYouEmail(savedOrder).catch(err => {
        console.error("Failed to send thank you email:", err);
      }),
      sendNewOrderNotificationToAdmin(savedOrder).catch(err => {
        console.error("Failed to send admin notification:", err);
      })
    ]);

    // ====================================================

    // Respond immediately to client
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
      success: false,
      message: "Server error placing guest order.",
      error: error.message,
      // Only send validation errors in development
      ...(process.env.NODE_ENV === 'development' && { 
        validationErrors: error.errors 
      })
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
    const orders = await GuestOrder.find()
      .sort({ createdAt: -1 })
      .populate("items.productId", "title price")
      .populate("items.storeId", "name");

    const totalOrders = await GuestOrder.countDocuments();

    res.status(200).json({
      success: true,
      count: orders.length,
      totalOrders,
      orders,
    });
  } catch (error) {
    console.error("Guest Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error retrieving guest orders.",
      error: error.message,
    });
  }
};