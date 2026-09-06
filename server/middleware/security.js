// backend/middleware/security.js
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import pool from "../lib/db.js";

// Helmet for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"], // Removed Supabase
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.paystack.co", "https://api.flutterwave.com"], // Removed Supabase
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Rate limiting
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

// Audit log middleware (MySQL)
export const auditLog = async (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    const logData = {
      user_id: req.user?.id || null,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: duration,
      ip: req.ip || req.connection?.remoteAddress || null,
      user_agent: req.headers["user-agent"] || null,
      timestamp: new Date().toISOString(),
    };

    pool
      .query(
        `INSERT INTO audit_logs 
         (user_id, method, path, status_code, duration_ms, ip, user_agent, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logData.user_id,
          logData.method,
          logData.path,
          logData.status_code,
          logData.duration_ms,
          logData.ip,
          logData.user_agent,
          logData.timestamp,
        ]
      )
      .catch(console.error);

    return originalSend.call(this, data);
  };

  next();
};

// GDPR consent middleware (MySQL)
export const gdprConsent = async (req, res, next) => {
  if (req.user) {
    try {
      const [rows] = await pool.query(
        `SELECT consented FROM user_consents 
         WHERE user_id = ? AND consent_type = 'gdpr'`,
        [req.user.id]
      );
      const consent = rows[0];
      if (!consent?.consented) {
        return res.status(403).json({
          success: false,
          message: "GDPR consent required.",
          requiresConsent: true,
        });
      }
    } catch (err) {
      console.error("GDPR consent check error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
  next();
};

// Data sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === "string") {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .trim();
    }
    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// SQL injection prevention (basic)
export const preventSqlInjection = (req, res, next) => {
  const sqlPatterns = /(\b(select|insert|update|delete|drop|alter|create|truncate)\b)|(--)|(';)|(\*\/)/i;

  const checkValue = (value) => {
    if (typeof value === "string" && sqlPatterns.test(value)) {
      return false;
    }
    return true;
  };

  const checkObject = (obj) => {
    if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        if (!checkObject(obj[key])) return false;
      }
    } else if (!checkValue(obj)) {
      return false;
    }
    return true;
  };

  if (!checkObject(req.body) || !checkObject(req.query) || !checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request parameters.",
    });
  }

  next();
};