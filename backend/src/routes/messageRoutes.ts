import { Router } from 'express';
import { createMessage, getMessages, updateMessage, deleteMessage } from '../controllers/messageController';
import { basicAuth } from '../controllers/authController'; // Import middleware otentikasi

const router = Router();

// Terapkan basicAuth ke semua rute pesan
router.use(basicAuth);

router.post('/', createMessage); // Membuat pesan baru
router.get('/', getMessages);    // Mendapatkan pesan
router.put('/:id', updateMessage); // Mengupdate pesan
router.delete('/:id', deleteMessage); // Menghapus pesan

export default router;
