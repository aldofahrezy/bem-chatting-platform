import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes'; // Ensure this path is correct
import messageRoutes from './routes/messageRoutes'; // Ensure this path is correct

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
// This basic route confirms Express is running
app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

// Mount the authentication routes
app.use('/api/auth', authRoutes); // Ensure this base path matches your frontend calls

// Mount the message routes
app.use('/api/messages', messageRoutes); // Ensure this base path matches your frontend calls

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
