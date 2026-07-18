import mongoose from "mongoose";

const guestOrderSchema = new mongoose.Schema(
  {
    // Guest Contact Information (Crucial since there's no User ID reference)
    guestInfo: {
        name: { 
        type: String, 
        required: true, 
        trim: true 
      },
      email: { 
        type: String, 
        required: false, 
        trim: true, 
        lowercase: true 
      },
      phone: { 
        type: String, 
        required: true 
      },
    },

    // Cart details extracted directly from the localCart
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: false,
        },
        storeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Store",
          required: true,
        },
        // Snapshots from the localCart to freeze data at the moment of checkout
        title: { type: String, required: true },
        image: { type: String },
        size: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Static price locked at checkout
      },
    ],

    // Financial breakdown
    totalAmount: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },

    // Delivery Location
    shippingAddress: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String }, 
      country: { type: String, required: true },
    },

    // Order Fulfillment & Lifecycle Tracking
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "Card", "Bank Transfer"],
      default: "Cash on Delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    
    // Optional token to let guests track their order via a unique URL later
    trackingToken: {
      type: String,
      unique: true,
    }
  },
  { timestamps: true }
);

export default mongoose.model("GuestOrder", guestOrderSchema);