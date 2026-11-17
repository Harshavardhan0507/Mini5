import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
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
import adminRoutes from './routes/admin.js';
import { seedDatabase } from './seed.js';
import { getMailerStatus } from './services/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Behind a reverse proxy (Render, Railway, nginx) so rate limits see the real client IP
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

// Restrict browser origins to the configured frontend(s)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, server-to-server, health checks
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    }
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded plant photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { fallthrough: true, maxAge: '7d' }));

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
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mailer = getMailerStatus();
  res.json({
    status: 'online',
    service: 'Kisan Fertilizer Shop & Multilingual AI Agro Doctor API',
    version: '2.1.0',
    db: 'SQLite (WAL Mode)',
    orderNotifications: mailer.configured
      ? `email (${mailer.recipient})`
      : `email not configured — logging to admin panel (${mailer.recipient})`,
    timestamp: new Date().toISOString()
  });
});

// Unknown API route -> JSON 404 instead of the SPA fallback
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// Serve the built React app when it exists (single-host deployment)
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Express Error-Handling Middleware (Ensures JSON responses, never HTML 500)
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body.' });
  }
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
    const mailer = getMailerStatus();
    app.listen(PORT, () => {
      console.log(`🌾 KisanAgro Backend Server running on http://localhost:${PORT}`);
      console.log(`🔒 Security active: Helmet headers, CORS allowlist, Rate limiting, SQLite persistence`);
      console.log(
        mailer.configured
          ? `📧 New orders are emailed to ${mailer.recipient} via ${mailer.host}`
          : `📭 SMTP not configured — orders are saved and recorded in the email log (target ${mailer.recipient})`
      );
    });
  })
  .catch((seedErr) => {
    console.error('Database initialization failed:', seedErr);
    process.exit(1);
  });
