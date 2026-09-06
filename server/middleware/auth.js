// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';

/**
 * Verifies the JWT sent as an HTTP‑only cookie and
 * attaches the authenticated user + their profile (role) to req.
 */
export async function requireAuth(req, res, next) {
  try {
    // ✅ Read token from cookie instead of Authorization header
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing authorization token",
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ JWT verification error:", err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    // Get user profile from database
    const [rows] = await pool.query(
      `SELECT * FROM profiles WHERE id = ?`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      console.error("❌ Profile not found for user:", decoded.userId);
      return res.status(403).json({
        success: false,
        message: "No profile found for this account",
      });
    }

    const profile = rows[0];

    // Attach user and profile to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.profile = profile;

    console.log(`✅ Auth successful: ${profile.email} (${profile.role}) [${profile.id}]`);
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication check failed",
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuth(req, res, next) {
  try {
    // ✅ Read token from cookie
    const token = req.cookies.token;

    if (!token) {
      // No token, continue without user
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Invalid token, continue without user
      return next();
    }

    const [rows] = await pool.query(
      `SELECT * FROM profiles WHERE id = ?`,
      [decoded.userId]
    );

    if (rows.length > 0) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
      req.profile = rows[0];
    }

    next();
  } catch (err) {
    // On error, continue without user
    next();
  }
}

/**
 * Use after requireAuth — restricts to organizer or admin roles.
 */
export function requireOrganizer(req, res, next) {
  if (!req.profile) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.profile?.role !== "organizer" && req.profile?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Organizer access required",
    });
  }
  next();
}

/**
 * Use after requireAuth — restricts to admin only.
 */
export function requireAdmin(req, res, next) {
  if (!req.profile) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.profile?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
}

/**
 * Use after requireAuth — restricts to verified users only
 */
export function requireVerified(req, res, next) {
  if (!req.profile) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.profile.is_verified) {
    return res.status(403).json({
      success: false,
      message: "Account verification required",
    });
  }
  next();
}

/**
 * Use after requireAuth — checks if user owns the resource
 * @param {Function} getResourceUserId - Function that returns the user ID of the resource owner
 */
export function requireResourceOwner(getResourceUserId) {
  return async (req, res, next) => {
    try {
      if (!req.profile) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Allow admin to bypass ownership check
      if (req.profile.role === "admin") {
        return next();
      }

      const resourceOwnerId = await getResourceUserId(req);

      if (req.profile.id !== resourceOwnerId) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      console.error("❌ Resource owner check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify resource ownership",
      });
    }
  };
}

/**
 * Combined middleware for organizer or admin access
 */
export function requireOrganizerOrAdmin(req, res, next) {
  return requireAuth(req, res, () => requireOrganizer(req, res, next));
}

/**
 * Combined middleware for admin access
 */
export function requireAdminOnly(req, res, next) {
  return requireAuth(req, res, () => requireAdmin(req, res, next));
}

/**
 * Get the authenticated user ID from the request
 */
export function getUserId(req) {
  return req.user?.id || req.profile?.id || null;
}

/**
 * Get the authenticated user's role from the request
 */
export function getUserRole(req) {
  return req.profile?.role || null;
}

/**
 * Check if the authenticated user is an organizer
 */
export function isOrganizer(req) {
  const role = getUserRole(req);
  return role === "organizer" || role === "admin";
}

/**
 * Check if the authenticated user is an admin
 */
export function isAdmin(req) {
  return getUserRole(req) === "admin";
}

/**
 * Check if the authenticated user is verified
 */
export function isVerified(req) {
  return req.profile?.is_verified || false;
}

// Export all middleware functions
export default {
  requireAuth,
  optionalAuth,
  requireOrganizer,
  requireAdmin,
  requireVerified,
  requireResourceOwner,
  requireOrganizerOrAdmin,
  requireAdminOnly,
  getUserId,
  getUserRole,
  isOrganizer,
  isAdmin,
  isVerified,
};