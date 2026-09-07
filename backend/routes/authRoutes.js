import express from 'express';
import { loginAdmin, registerAdmin, getAdminProfile, logoutAdmin } from '../controllers/authController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.get('/profile', protectAdmin, getAdminProfile);
router.post('/logout', protectAdmin, logoutAdmin);

export default router;
