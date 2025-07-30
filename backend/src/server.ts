import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

// --- KONFIGURASI CORS UNTUK PRODUKSI ---
const allowedOrigins = [
  'http://localhost:3000', // Untuk pengembangan lokal
  'http://localhost:5001', // Jika frontend dan backend berjalan di port berbeda di localhost
  process.env.FRONTEND_URL_PRODUCTION || '', // URL frontend Vercel Anda di produksi
].filter(Boolean); // Filter untuk menghapus string kosong jika FRONTEND_URL_PRODUCTION tidak ada

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan permintaan tanpa origin (misal: dari Postman, cURL, aplikasi mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Izinkan metode yang Anda gunakan
  credentials: true, // Jika Anda mengirim cookies atau header Authorization
}));
// --- AKHIR KONFIGURASI CORS ---

app.use(express.json());

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});