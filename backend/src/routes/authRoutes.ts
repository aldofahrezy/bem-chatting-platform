import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';
const router = Router();

// Define POST routes for register and login
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;