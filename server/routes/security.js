// backend/routes/security.js
import { Router } from "express";
import pool from "../lib/db.js";

const router = Router();

// Get user consent status
router.get("/consent/status", async (req, res) => {
  const { user } = req;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_consents WHERE user_id = ?`,
      [user.id]
    );
    res.json({
      success: true,
      consent: rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user consent
router.post("/consent/update", async (req, res) => {
  const { user } = req;
  const { gdprConsent, marketingConsent } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO user_consents (user_id, consent_type, consented, created_at, updated_at)
       VALUES (?, 'gdpr', ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE consented = ?, updated_at = NOW()`,
      [user.id, gdprConsent || 0, gdprConsent || 0]
    );
    if (marketingConsent !== undefined) {
      await pool.query(
        `INSERT INTO user_consents (user_id, consent_type, consented, created_at, updated_at)
         VALUES (?, 'marketing', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE consented = ?, updated_at = NOW()`,
        [user.id, marketingConsent, marketingConsent]
      );
    }

    // Get updated consents
    const [rows] = await pool.query(
      `SELECT * FROM user_consents WHERE user_id = ?`,
      [user.id]
    );
    const consent = rows.reduce((acc, row) => {
      acc[row.consent_type] = !!row.consented;
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Consent updated successfully.",
      consent,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Request data export (GDPR)
router.post("/data-export", async (req, res) => {
  const { user } = req;

  try {
    // Gather all user data
    const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [user.id]);
    const [orderRows] = await pool.query(`SELECT * FROM orders WHERE buyer_email = ?`, [user.email]);
    const [ticketRows] = await pool.query(
      `SELECT t.*, o.buyer_email
       FROM tickets t
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE o.buyer_email = ?`,
      [user.email]
    );
    const [reviewRows] = await pool.query(`SELECT * FROM reviews WHERE user_id = ?`, [user.id]);
    const [waitlistRows] = await pool.query(`SELECT * FROM waitlist WHERE email = ?`, [user.email]);

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        profile: profileRows[0] || null,
        created_at: user.created_at,
      },
      orders: orderRows || [],
      tickets: ticketRows || [],
      reviews: reviewRows || [],
      waitlist: waitlistRows || [],
      exported_at: new Date().toISOString(),
    };

    // In production, generate a JSON file and email it to the user
    res.json({
      success: true,
      message: "Data export requested. You will receive an email with your data.",
      data: exportData, // In production, remove this and send via email
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete account (GDPR)
router.post("/delete-account", async (req, res) => {
  const { user } = req;
  const { confirm } = req.body;

  if (!confirm || confirm !== "DELETE") {
    return res.status(400).json({ 
      success: false, 
      message: "Please confirm deletion by typing 'DELETE'." 
    });
  }

  try {
    // Anonymize user data instead of hard delete
    await pool.query(
      `UPDATE profiles 
       SET email = CONCAT('deleted_', id, '@deleted.user'),
           full_name = 'Deleted User',
           phone = NULL,
           avatar_url = NULL,
           is_deleted = 1,
           deleted_at = NOW()
       WHERE id = ?`,
      [user.id]
    );

    // If you have a sessions table, you could delete sessions here.
    res.json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;