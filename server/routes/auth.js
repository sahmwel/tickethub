// backend/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

// ─── Sign Up ──────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password, fullName, role, country } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ success: false, error: 'Email, password, and full name are required' });
  }

  try {
    // ✅ Prevent duplicate accounts producing a confusing DB error later
    const [existing] = await pool.query(`SELECT id FROM profiles WHERE email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const userId = uuidv4();
    const hashed = await bcrypt.hash(password, 10);

    // ✅ FIX: `password` column added to both the column list and the values array.
    // Previously `hashed` was computed but never persisted, so every account
    // had a NULL password and could never log in.
    await pool.query(
      `INSERT INTO profiles (id, email, full_name, password, role, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, email, fullName, hashed, role || 'attendee', country || 'Nigeria']
    );

    await pool.query(
      `INSERT INTO wallets (user_id, balance, currency) VALUES (?, 0, 'NGN')`,
      [userId]
    );

    const token = jwt.sign(
      { userId, email, role: role || 'attendee' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, userId });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Sign In ──────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, password, role FROM profiles WHERE email = ?`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];

    // ✅ Guard against legacy rows that still have a NULL password
    // (accounts created before this fix). bcrypt.compare throws on a
    // non-string hash instead of just returning false.
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'This account has no password set. Please sign up again or reset your password.',
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Logout ───────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ success: true, message: 'Logged out' });
});

// ─── Get Current User (profile) ───────────
router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT id, email, full_name, role, country, is_verified FROM profiles WHERE id = ?`,
      [decoded.userId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, profile: rows[0] });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

export default router;