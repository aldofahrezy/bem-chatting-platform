import { Router } from 'express';
import { createMessage, getMessages, updateMessage, deleteMessage, getMessageRequests, getConversationHistory } from '../controllers/messageController'; // Import getConversationHistory
import { basicAuth } from '../controllers/authController';

const router = Router();

router.use(basicAuth);

router.post('/', createMessage);
router.get('/', getMessages); // Hanya untuk pesan normal (teman)
router.get('/requests', getMessageRequests); // Untuk pesan permintaan
router.get('/history', getConversationHistory); // Rute baru untuk semua riwayat percakapan
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);

export default router;