// backend/routes/authOTP.js
import { Router } from "express";
import pool from "../lib/db.js";
import { transporter } from "../lib/mailer.js";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ─── Send welcome OTP ──────────────────────────────────────────────
router.post("/send-welcome-otp", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = req.profile;

    console.log(`📤 Sending OTP for user ${userId} (${profile.email})`);

    const otpCode = generateOTP();
    // ⏰ Store expiry in UTC (ISO string)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const [result] = await pool.query(
      `INSERT INTO otps (user_id, code, purpose, expires_at, used)
       VALUES (?, ?, 'verify_email', ?, 0)`,
      [userId, otpCode, expiresAt]
    );

    console.log(`✅ OTP inserted: ${otpCode} (id: ${result.insertId}, expires: ${expiresAt})`);

    // Role‑specific welcome message
    const role = profile.role || "attendee";
    const welcomeMessage =
      role === "organizer"
        ? "Welcome, Organizer! 🎉 Start creating events and selling tickets."
        : "Welcome, Attendee! 🎟️ Discover amazing events near you.";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
        <h1 style="color: #F2B33D; font-size: 24px;">Welcome to Sahm TicketHub</h1>
        <p style="color: #D8D6DE; font-size: 16px;">${welcomeMessage}</p>
        <p style="color: #D8D6DE;">To get started, please verify your email with this OTP:</p>
        <div style="background: #141418; border-radius: 12px; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #F2B33D; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="color: #8A8993; font-size: 14px;">This code will expire in 15 minutes.</p>
        <p style="color: #8A8993; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: profile.email,
      subject: `Welcome to Sahm TicketHub – Your OTP code`,
      html,
    });

    console.log(`📧 Email sent to ${profile.email}`);

    res.json({
      success: true,
      message: "Welcome email with OTP sent successfully.",
    });
  } catch (err) {
    console.error("❌ Error sending welcome OTP:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Verify OTP ─────────────────────────────────────────────────────
router.post("/verify-otp", requireAuth, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  console.log(`🔍 Verifying OTP for user ${userId}, code: ${code}`);

  if (!code) {
    return res.status(400).json({ success: false, message: "OTP code required." });
  }

  try {
    // 🕐 Log current UTC time for debugging
    console.log(`🕐 Current UTC time: ${new Date().toISOString()}`);

    // Debug: show recent OTPs for this user
    const [allOtps] = await pool.query(
      `SELECT id, code, used, expires_at FROM otps 
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    console.log(`📋 Last 5 OTPs for user ${userId}:`, allOtps);

    // ✅ Compare with UTC_TIMESTAMP() to avoid timezone issues
    const [rows] = await pool.query(
      `SELECT id FROM otps
       WHERE user_id = ? AND code = ? AND purpose = 'verify_email' AND used = 0 AND expires_at > UTC_TIMESTAMP()`,
      [userId, code]
    );

    if (rows.length === 0) {
      // Check if a matching code exists but is expired or used
      const [expiredOrUsed] = await pool.query(
        `SELECT id, used, expires_at FROM otps
         WHERE user_id = ? AND code = ? AND purpose = 'verify_email'`,
        [userId, code]
      );
      if (expiredOrUsed.length > 0) {
        const record = expiredOrUsed[0];
        if (record.used) {
          console.warn(`⚠️ OTP for user ${userId} was already used.`);
        } else if (new Date(record.expires_at) < new Date()) {
          console.warn(`⚠️ OTP for user ${userId} expired at ${record.expires_at}.`);
        }
      } else {
        console.warn(`⚠️ No OTP found for user ${userId} with code ${code}.`);
      }
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    const otpId = rows[0].id;

    // Mark OTP as used
    await pool.query(`UPDATE otps SET used = 1 WHERE id = ?`, [otpId]);
    console.log(`✅ OTP ${otpId} marked as used`);

    // Mark profile as verified
    await pool.query(`UPDATE profiles SET is_verified = 1 WHERE id = ?`, [userId]);
    console.log(`✅ User ${userId} marked as verified`);

    res.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;