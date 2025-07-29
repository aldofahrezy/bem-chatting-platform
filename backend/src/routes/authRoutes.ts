import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController'; // Ensure these functions are correctly imported

const router = Router();

// Define POST routes for register and login
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router; // Ensure the router is exported as default