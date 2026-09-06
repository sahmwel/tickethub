import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── FOLDER MAPPING ────────────────────────────────────────────────
const UPLOAD_TYPES = {
  cover: 'covers',
  'guest-artist': 'guest-artists',
  'artiste': 'guest-artists',          // alias for guest-artist
  'event-gallery': 'event-gallery',
  'gallery': 'event-gallery',          // alias for event-gallery
};

// ─── MULTER STORAGE ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const routePath = req.route.path; // e.g., '/cover', '/artiste'
    const typeKey = routePath.replace('/', ''); // 'cover', 'artiste', etc.
    const folder = UPLOAD_TYPES[typeKey] || 'misc';
    const uploadDir = `uploads/${folder}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname || 'file';
    cb(null, `${prefix}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── UPLOAD HANDLER ─────────────────────────────────────────────────
const handleUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;

    return res.json({
      success: true,
      fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      message: 'Upload successful',
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Upload failed',
    });
  }
};

// ─── ROUTES ─────────────────────────────────────────────────────────
router.post('/cover', requireAuth, upload.single('file'), handleUpload);
router.post('/guest-artist', requireAuth, upload.single('file'), handleUpload);
router.post('/artiste', requireAuth, upload.single('file'), handleUpload);      // 👈 new alias
router.post('/event-gallery', requireAuth, upload.single('file'), handleUpload);
router.post('/gallery', requireAuth, upload.single('file'), handleUpload);      // 👈 existing alias

// Generic fallback (optional)
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  handleUpload(req, res);
});

export default router;