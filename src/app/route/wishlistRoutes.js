import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controller/wishlistController.js";

const router = express.Router();
import { protect } from "../middleware/Usermiddleware.js";  
router.use(protect);

// Get wishlist of a user
router.get("/:userId", getWishlist);

// Add product to wishlist
router.post("/:userId", addToWishlist);

// Remove product from wishlist
router.delete("/:userId", removeFromWishlist);

export default router;
