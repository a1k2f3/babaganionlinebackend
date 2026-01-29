import express from 'express';
import { registerAdmin, loginAdmin } from '../controller/admincontroller.js';

const router = express.Router();

// ── Admin routes ──
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

export default router;