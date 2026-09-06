// backend/routes/emailMarketing.js
import { Router } from "express";
import pool from "../lib/db.js";
import { transporter } from "../lib/mailer.js";

const router = Router();

// ─── Send event reminder emails ────────────────────────────────────
router.post("/send-reminders", async (req, res) => {
  const { eventId } = req.body;

  try {
    // Get event details (no ticket_types needed)
    const [eventRows] = await pool.query(
      `SELECT id, title, start_at, venue_name FROM events WHERE id = ?`,
      [eventId]
    );
    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }
    const event = eventRows[0];

    // Get attendees (tickets) with order buyer email
    const [ticketRows] = await pool.query(
      `SELECT t.holder_name, o.buyer_email, o.buyer_name
       FROM tickets t
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE t.event_id = ? AND t.checked_in = 0`,
      [eventId]
    );

    const uniqueEmails = [...new Set(ticketRows.map(t => t.buyer_email))];

    const emailPromises = uniqueEmails.map(email => {
      const attendee = ticketRows.find(t => t.buyer_email === email);
      return sendEventReminderEmail({
        to: email,
        eventTitle: event.title,
        eventDate: event.start_at,
        venue: event.venue_name,
        holderName: attendee?.holder_name || attendee?.buyer_name || "Valued attendee",
      });
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Reminders sent to ${uniqueEmails.length} attendees.`,
    });
  } catch (err) {
    console.error("❌ Error sending reminders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Send newsletter ──────────────────────────────────────────────────
router.post("/send-newsletter", async (req, res) => {
  const { subject, content, audience } = req.body;

  try {
    let subscribers = [];
    if (audience === "all") {
      const [rows] = await pool.query(
        `SELECT email FROM email_subscribers WHERE is_subscribed = 1`
      );
      subscribers = rows;
    } else if (audience === "attendees") {
      const [rows] = await pool.query(
        `SELECT DISTINCT buyer_email as email FROM orders WHERE status = 'paid'`
      );
      subscribers = rows;
    } else {
      return res.status(400).json({ success: false, message: "Invalid audience." });
    }

    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      await Promise.all(batch.map(({ email }) =>
        sendNewsletterEmail({ to: email, subject, content })
      ));
    }

    res.json({
      success: true,
      message: `Newsletter sent to ${subscribers.length} subscribers.`,
    });
  } catch (err) {
    console.error("❌ Error sending newsletter:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Subscribe ──────────────────────────────────────────────────────
router.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email required." });
  }
  try {
    await pool.query(
      `INSERT INTO email_subscribers (email, is_subscribed, subscribed_at)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_subscribed = 1, subscribed_at = NOW()`,
      [email]
    );
    res.json({ success: true, message: "Subscribed successfully!" });
  } catch (err) {
    console.error("❌ Error subscribing:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Unsubscribe ────────────────────────────────────────────────────
router.post("/unsubscribe", async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query(
      `UPDATE email_subscribers SET is_subscribed = 0 WHERE email = ?`,
      [email]
    );
    res.json({ success: true, message: "Unsubscribed successfully." });
  } catch (err) {
    console.error("❌ Error unsubscribing:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Helper functions (unchanged) ──────────────────────────────────
async function sendEventReminderEmail({ to, eventTitle, eventDate, venue, holderName }) {
  const formattedDate = new Date(eventDate).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Event Reminder</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${eventTitle}</h2>
      <p style="color: #D8D6DE;">Don't forget! Your event is coming up soon.</p>
      <div style="background: #141418; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p><strong>Date & Time:</strong> ${formattedDate}</p>
        <p><strong>Venue:</strong> ${venue}</p>
        <p><strong>Ticket Holder:</strong> ${holderName}</p>
      </div>
      <a href="${process.env.CLIENT_ORIGIN || 'https://yourdomain.com'}/manage-ticket" style="background: #F2B33D; color: #0A0A0C; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
        View Your Tickets
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Reminder: ${eventTitle} is coming up!`,
    html,
  });
}

async function sendNewsletterEmail({ to, subject, content }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0C; color: #F5F1E8; padding: 40px; border-radius: 16px;">
      <h1 style="color: #F2B33D; font-size: 24px;">Sahm TicketHub</h1>
      <h2 style="color: #F5F1E8; font-size: 20px;">${subject}</h2>
      <div style="color: #D8D6DE; line-height: 1.6;">
        ${content}
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #26262C;">
        <a href="${process.env.CLIENT_ORIGIN || 'https://yourdomain.com'}/unsubscribe?email=${encodeURIComponent(to)}" style="color: #8A8993; font-size: 12px;">
          Unsubscribe
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export default router;