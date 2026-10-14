import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

// Fail fast on startup if critical security environment variables are missing
if (!process.env.JWT_SECRET) {
  console.error('\n❌ FATAL CONFIGURATION ERROR:');
  console.error('The JWT_SECRET environment variable is not defined.');
  console.error('Please create a server/.env file with a strong JWT_SECRET (e.g. JWT_SECRET=your_secure_secret_key).\n');
  process.exit(1);
}

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import chatbotRoutes from './routes/chatbot.js';
import orderRoutes from './routes/orders.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded plant photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Login and registration rate limiter to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Kisan Fertilizer Shop & Multilingual AI Agro Doctor API',
    version: '2.0.0',
    db: 'SQLite (WAL Mode)',
    timestamp: new Date().toISOString()
  });
});

// Global Express Error-Handling Middleware (Ensures JSON responses, never HTML 500)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

// Ensure database tables and initial demo data are ready, then start server
seedDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🌾 KisanAgro Backend Server running on http://localhost:${PORT}`);
      console.log(`🔒 Security active: Helmet headers, Rate limiting, SQLite persistence`);
    });
  })
  .catch((seedErr) => {
    console.error('Database initialization failed:', seedErr);
    process.exit(1);
  });
