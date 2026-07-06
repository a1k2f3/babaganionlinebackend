import express from "express";
import {
  createGuestOrder,
  getGuestOrderDetails,
  updateGuestOrderStatus,
  getAllGuestOrders // <-- Import the new controller
} from "../controller/guestOrderController.js";

const router = express.Router();

// Route to get all guest orders (Highly recommended to add your Admin protect middleware here!)
router.get("/", getAllGuestOrders);

// Route to process a new order from localCart
router.post("/checkout", createGuestOrder);

// Route to get tracking updates without an account
router.get("/track/:token", getGuestOrderDetails);

// Route for backend/admin updates to order status
router.put("/:id/status", updateGuestOrderStatus);

export default router;