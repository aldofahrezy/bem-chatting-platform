import { Router } from 'express';
import { basicAuth } from '../controllers/authController';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingFriendRequests,
  getSuggestions // Import getSuggestions
} from '../controllers/userController';

const router = Router();

// Terapkan basicAuth ke semua rute pengguna
router.use(basicAuth);

router.get('/search', searchUsers); // Mencari pengguna
router.post('/friend-request', sendFriendRequest); // Mengirim permintaan pertemanan
router.put('/friend-request/:friendshipId/accept', acceptFriendRequest); // Menerima permintaan pertemanan
router.put('/friend-request/:friendshipId/reject', rejectFriendRequest); // Menolak permintaan pertemanan
router.get('/friends', getFriends); // Mendapatkan daftar teman
router.get('/friend-requests/pending', getPendingFriendRequests); // Mendapatkan permintaan pertemanan pending
router.get('/suggestions', getSuggestions); // Rute baru untuk saran pengguna

export default router;
