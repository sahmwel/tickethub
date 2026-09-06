// backend/routes/waitlist.js
import { Router } from "express";
import pool from "../lib/db.js";
import { transporter } from "../lib/mailer.js";

const router = Router();

// Join waitlist
router.post("/join", async (req, res) => {
  const { eventId, email, name, quantity = 1 } = req.body;

  if (!eventId || !email) {
    return res.status(400).json({ success: false, message: "Event ID and email required." });
  }

  try {
    // Check if already on waitlist
    const [existing] = await pool.query(
      `SELECT id FROM waitlist WHERE event_id = ? AND email = ?`,
      [eventId, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Already on waitlist." });
    }

    const [result] = await pool.query(
      `INSERT INTO waitlist (event_id, email, name, quantity, joined_at, notified)
       VALUES (?, ?, ?, ?, NOW(), 0)`,
      [eventId, email, name || null, quantity || 1]
    );

    res.json({
      success: true,
      message: "Added to waitlist successfully.",
      position: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Check waitlist status
router.get("/status/:eventId/:email", async (req, res) => {
  const { eventId, email } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT id, joined_at, notified FROM waitlist WHERE event_id = ? AND email = ?`,
      [eventId, email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Not on waitlist." });
    }
    const entry = rows[0];

    // Count people ahead
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as count FROM waitlist WHERE event_id = ? AND joined_at < ?`,
      [eventId, entry.joined_at]
    );
    const totalAhead = countRows[0].count;

    res.json({
      success: true,
      position: totalAhead + 1,
      totalAhead,
      notified: !!entry.notified,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Get all waitlist entries for an event
router.get("/event/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM waitlist WHERE event_id = ? ORDER BY joined_at ASC`,
      [eventId]
    );
    res.json({ success: true, waitlist: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Notify waitlist when tickets become available
router.post("/notify/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    const [waitlist] = await pool.query(
      `SELECT w.*, e.title as event_title, e.slug
       FROM waitlist w
       LEFT JOIN events e ON w.event_id = e.id
       WHERE w.event_id = ? AND w.notified = 0
       ORDER BY w.joined_at ASC`,
      [eventId]
    );

    // Send notifications
    for (const entry of waitlist) {
      await sendWaitlistNotification({
        to: entry.email,
        name: entry.name || "Valued attendee",
        eventTitle: entry.event_title || "the event",
        eventId: eventId,
      });

      // Mark as notified
      await pool.query(
        `UPDATE waitlist SET notified = 1 WHERE id = ?`,
        [entry.id]
      );
    }

    res.json({
      success: true,
      message: `Notified ${waitlist.length} waitlist members.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// EXPORTED HELPER FUNCTIONS
// ============================================

/**
 * Notify waitlist when a specific ticket type becomes available
 * This is called from payments.js when tickets are purchased
 */
export async function notifyWaitlistForTicketType({ ticketTypeId, eventId, quantity }) {
  try {
    // Get waitlist entries for this event
    const [waitlist] = await pool.query(
      `SELECT w.*, e.title as event_title, e.slug
       FROM waitlist w
       LEFT JOIN events e ON w.event_id = e.id
       WHERE w.event_id = ? AND w.notified = 0
       ORDER BY w.joined_at ASC`,
      [eventId]
    );

    if (waitlist.length === 0) {
      return { success: true, notified: 0, message: "No waitlist members to notify." };
    }

    // Get ticket type name
    const [ttRows] = await pool.query(
      `SELECT name FROM ticket_types WHERE id = ?`,
      [ticketTypeId]
    );
    const ticketTypeName = ttRows[0]?.name || "tickets";

    for (const entry of waitlist) {
      await sendWaitlistAvailableEmail({
        to: entry.email,
        name: entry.name || "Valued attendee",
        ticketTypeName: ticketTypeName,
        eventTitle: entry.event_title || "the event",
        eventSlug: entry.slug || "",
      });

      await pool.query(
        `UPDATE waitlist SET notified = 1 WHERE id = ?`,
        [entry.id]
      );
    }

    return { success: true, notified: waitlist.length };
  } catch (error) {
    console.error("Error notifying waitlist:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// HELPER FUNCTIONS (INTERNAL)
// ============================================

async function sendWaitlistNotification({ to, name, eventTitle, eventId }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Tickets Available!</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${eventTitle}</h2>
      <p style="color: #D8D6DE;">
        Hi ${name},<br><br>
        Good news! Tickets for ${eventTitle} are now available.<br>
        You were on the waitlist, so we wanted to let you know first.
      </p>
      <a href="https://yourdomain.com/events/${eventId}" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        Get Your Tickets Now
      </a>
      <p style="color: #8A8993; font-size: 12px; margin-top: 20px;">
        Hurry - tickets are limited!
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `🎟️ Tickets available for ${eventTitle}!`,
    html,
  });
}

async function sendWaitlistAvailableEmail({ to, name, ticketTypeName, eventTitle, eventSlug }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Good news, ${name.split(" ")[0]}!</h1>
      <p style="color: #D8D6DE;">
        ${ticketTypeName} tickets for <strong>${eventTitle}</strong> are available again — grab yours before they're gone.
      </p>
      <a href="https://yourdomain.com/events/${eventSlug}" style="display:inline-block;background:#F2B33D;color:#0A0A0C;font-weight:bold;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;">
        Get your ticket
      </a>
      <p style="color: #8A8993; font-size: 12px; margin-top: 20px;">
        This link will take you straight to the event page.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Tickets available now — ${eventTitle}`,
    html,
  });
}

export default router;