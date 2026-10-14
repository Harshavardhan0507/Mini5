import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { diagnoseCrop, chatMessage, getDiagnosisHistory } from '../controllers/diagnosisController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'crop-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only valid image files (jpg, jpeg, png, webp) are permitted.'));
    }
  }
});

// Rate limiters to protect AI quota and server resources
export const diagnoseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 scans per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many diagnostic requests from this network. Please wait a few minutes before submitting another scan.'
  }
});

export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 messages per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chat messages. Please wait a moment before sending more queries.'
  }
});

const router = Router();

// Middleware to wrap multer and ensure JSON response on multer errors
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Image file is too large. Maximum size is 10 MB.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid upload.' });
    }
    next();
  });
}

// Endpoint for leaf image upload & diagnosis (rate limited, optionalAuth to link history)
router.post('/diagnose', diagnoseLimiter, optionalAuth, handleUpload, diagnoseCrop);

// Endpoint for text-based symptom or general agricultural queries
router.post('/message', chatLimiter, optionalAuth, chatMessage);

// Endpoint for retrieving logged-in user's diagnosis history
router.get('/history', requireAuth, getDiagnosisHistory);

export default router;
