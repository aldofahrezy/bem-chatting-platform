import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes'; // Import user routes

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001; // Menggunakan port 5001
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

app.use('/api/auth', authRoutes); // Gunakan rute otentikasi
app.use('/api/messages', messageRoutes); // Gunakan rute pesan
app.use('/api/users', userRoutes); // Gunakan rute pengguna

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});