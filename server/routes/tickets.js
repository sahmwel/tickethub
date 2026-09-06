// backend/routes/tickets.js
import { Router } from "express";
import crypto from "crypto";
import pool from "../lib/db.js";
import QRCode from "qrcode";
import { requireAuth } from "../middleware/auth.js";
import {
  sendTransferOtpEmail,
  sendTransferredTicketEmail,
  sendTransferConfirmationEmail,
  sendTicketLookupOtpEmail,
} from "../lib/mailer.js";

const router = Router();

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_IN || 5);

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// Get ticket details by code - Public (for QR scanning/verification)
router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const [rows] = await pool.query(
      `SELECT t.*,
        tt.id as ticket_type_id, tt.name as ticket_type_name, tt.price,
        o.id as order_id, o.buyer_name, o.buyer_email,
        e.id as event_id, e.title, e.venue_name, e.start_at, e.end_at, e.cover_image
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN orders o ON t.order_id = o.id
       LEFT JOIN events e ON t.event_id = e.id
       WHERE t.code = ?`,
      [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    const ticket = rows[0];

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        code: ticket.code,
        holder_name: ticket.holder_name,
        checked_in: !!ticket.checked_in,
        checked_in_at: ticket.checked_in_at,
        transferred_at: ticket.transferred_at,
        transferred_to_name: ticket.transferred_to_name,
        ticket_type: {
          id: ticket.ticket_type_id,
          name: ticket.ticket_type_name,
          price: ticket.price,
        },
        event: {
          id: ticket.event_id,
          title: ticket.title,
          venue_name: ticket.venue_name,
          start_at: ticket.start_at,
          end_at: ticket.end_at,
          cover_image: ticket.cover_image,
        },
        order: {
          buyer_name: ticket.buyer_name,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
});

// ============================================
// REQUEST A TRANSFER OTP (Requires Auth - User must own the ticket)
// ============================================
router.post("/:ticketId/request-transfer", requireAuth, async (req, res) => {
  const { ticketId } = req.params;
  const userId = req.user.id;

  try {
    // Get ticket and verify ownership
    const [ticketRows] = await pool.query(
      `SELECT t.*, o.user_id, o.buyer_email
       FROM tickets t
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE t.id = ?`,
      [ticketId]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    const ticket = ticketRows[0];

    if (ticket.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't own this ticket" });
    }

    if (ticket.checked_in) {
      return res.status(400).json({ success: false, message: "This ticket has already been checked in and can no longer be transferred." });
    }

    if (ticket.transferred_at) {
      return res.status(400).json({ success: false, message: "This ticket has already been transferred." });
    }

    const buyerEmail = ticket.buyer_email;
    if (!buyerEmail) {
      return res.status(400).json({ success: false, message: "No buyer email on file for this ticket" });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO ticket_transfer_otps (ticket_id, code, expires_at) VALUES (?, ?, ?)`,
      [ticketId, code, expiresAt]
    );

    await sendTransferOtpEmail({
      to: buyerEmail,
      code,
      ticketHolderName: ticket.holder_name,
    });

    const maskedEmail = buyerEmail.replace(/^(.{1,3}).*(@.*)$/, "$1***$2");

    return res.json({ success: true, message: "Verification code sent", maskedEmail });
  } catch (err) {
    console.error("❌ Error requesting transfer OTP:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to send verification code" });
  }
});

// ============================================
// VERIFY OTP + COMPLETE TRANSFER (Requires Auth)
// ============================================
router.post("/:ticketId/transfer", requireAuth, async (req, res) => {
  const { ticketId } = req.params;
  const { code, newHolderName, newHolderEmail } = req.body;
  const userId = req.user.id;

  if (!code || !newHolderName || !newHolderName.trim()) {
    return res.status(400).json({ success: false, message: "Missing verification code or new holder name" });
  }

  try {
    // Get ticket and verify ownership
    const [ticketRows] = await pool.query(
      `SELECT t.*, o.user_id, o.payment_reference, o.buyer_email,
              e.title as event_title, e.start_at as event_start, e.venue_name as event_venue
       FROM tickets t
       LEFT JOIN orders o ON t.order_id = o.id
       LEFT JOIN events e ON t.event_id = e.id
       WHERE t.id = ?`,
      [ticketId]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    const ticket = ticketRows[0];

    if (ticket.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't own this ticket" });
    }
    if (ticket.checked_in) {
      return res.status(400).json({ success: false, message: "This ticket has already been checked in." });
    }
    if (ticket.transferred_at) {
      return res.status(400).json({ success: false, message: "This ticket has already been transferred." });
    }

    // Verify OTP
    const [otpRows] = await pool.query(
      `SELECT * FROM ticket_transfer_otps
       WHERE ticket_id = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [ticketId, code]
    );
    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }
    const otpRow = otpRows[0];
    await pool.query(`UPDATE ticket_transfer_otps SET used = 1 WHERE id = ?`, [otpRow.id]);

    const oldHolderName = ticket.holder_name;
    const oldTicketCode = ticket.code;
    const newTicketCode = crypto.randomUUID();
    const trimmedEmail = newHolderEmail?.trim() || null;
    const transferredAt = new Date().toISOString();

    // Update ticket
    await pool.query(
      `UPDATE tickets
       SET holder_name = ?, holder_email = ?, code = ?, transferred_at = ?, transferred_to_name = ?
       WHERE id = ?`,
      [newHolderName.trim(), trimmedEmail, newTicketCode, transferredAt, newHolderName.trim(), ticketId]
    );

    // Log transfer
    await pool.query(
      `INSERT INTO ticket_transfers (ticket_id, from_holder_name, to_holder_name, to_holder_email, old_code, new_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, oldHolderName, newHolderName.trim(), trimmedEmail, oldTicketCode, newTicketCode]
    );

    console.log(`✅ Ticket ${ticketId} transferred from "${oldHolderName}" to "${newHolderName.trim()}"`);

    // Notify original buyer
    const originalBuyerEmail = ticket.buyer_email;
    if (originalBuyerEmail) {
      try {
        await sendTransferConfirmationEmail({
          to: originalBuyerEmail,
          originalHolderName: oldHolderName,
          newHolderName: newHolderName.trim(),
          eventTitle: ticket.event_title || "your event",
          eventDate: ticket.event_start || "",
          venue: ticket.event_venue || "",
          reference: ticket.payment_reference || "",
        });
      } catch (emailErr) {
        console.error("⚠️ Failed to email original buyer:", emailErr);
      }
    }

    // Send new holder their ticket
    let notifiedNewHolder = false;
    if (trimmedEmail) {
      try {
        const qrBuffer = await QRCode.toBuffer(newTicketCode);
        await sendTransferredTicketEmail({
          to: trimmedEmail,
          holderName: newHolderName.trim(),
          eventTitle: ticket.event_title || "your event",
          eventDate: ticket.event_start || "",
          venue: ticket.event_venue || "",
          reference: ticket.payment_reference || "",
          qrBuffer,
        });
        notifiedNewHolder = true;
      } catch (emailErr) {
        console.error("⚠️ Failed to email new holder:", emailErr);
      }
    }

    return res.json({
      success: true,
      message: "Ticket transferred successfully",
      notifiedNewHolder,
      transferredAt,
    });
  } catch (err) {
    console.error("❌ Error completing transfer:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to transfer ticket" });
  }
});

// ============================================
// REQUEST A TICKET-LOOKUP OTP (by email) - Public
// ============================================
router.post("/lookup/request", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO ticket_lookup_otps (email, code, expires_at) VALUES (?, ?, ?)`,
      [trimmedEmail, code, expiresAt]
    );

    await sendTicketLookupOtpEmail({ to: trimmedEmail, code });

    const maskedEmail = trimmedEmail.replace(/^(.{1,3}).*(@.*)$/, "$1***$2");
    return res.json({ success: true, message: "Verification code sent", maskedEmail });
  } catch (err) {
    console.error("❌ Error requesting lookup OTP:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to send verification code" });
  }
});

// ============================================
// VERIFY OTP + LIST ALL TICKETS FOR THAT EMAIL - Public
// ============================================
// ============================================
// VERIFY OTP + LIST ALL TICKETS FOR THAT EMAIL - Public
// ============================================
router.post("/lookup/verify", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and code are required" });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();

    const [otpRows] = await pool.query(
      `SELECT * FROM ticket_lookup_otps
       WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, code]
    );
    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }
    const otpRow = otpRows[0];
    await pool.query(`UPDATE ticket_lookup_otps SET used = 1 WHERE id = ?`, [otpRow.id]);

    // Fetch orders with tickets 
    const [orderRows] = await pool.query(
      `SELECT o.*,
              e.id as event_id,
              e.title as event_title,
              e.start_at as event_start_at,
              e.venue_name as event_venue_name,
              e.city as event_city,
              e.cover_image as event_cover_image
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.buyer_email = ? AND o.status = 'paid'
       ORDER BY o.created_at DESC`,
      [trimmedEmail]
    );

    if (orderRows.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orderIds = orderRows.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    // Fetch tickets for these orders
    const [ticketRows] = await pool.query(
      `SELECT t.*,
              tt.id as ticket_type_id,
              tt.name as ticket_type_name,
              tt.price as ticket_type_price
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.order_id IN (${placeholders})`,
      orderIds
    );

    // Group tickets by order_id
    const ticketsByOrder = {};
    for (const t of ticketRows) {
      if (!ticketsByOrder[t.order_id]) ticketsByOrder[t.order_id] = [];
      ticketsByOrder[t.order_id].push({
        id: t.id,
        code: t.code,
        holder_name: t.holder_name,
        checked_in: t.checked_in,
        checked_in_at: t.checked_in_at,
        transferred_at: t.transferred_at,
        transferred_to_name: t.transferred_to_name,
        ticket_type: {
          id: t.ticket_type_id,
          name: t.ticket_type_name,
          price: t.ticket_type_price,
        },
      });
    }

    const orders = orderRows.map((o) => ({
      ...o,
      event: {
        id: o.event_id,
        title: o.event_title,
        start_at: o.event_start_at,
        venue_name: o.event_venue_name,
        city: o.event_city,
        cover_image: o.event_cover_image,
      },
      tickets: ticketsByOrder[o.id] || [],
    }));

    // Remove extra fields from order object
    orders.forEach(o => {
      delete o.event_id;
      delete o.event_title;
      delete o.event_start_at;
      delete o.event_venue_name;
      delete o.event_city;
      delete o.event_cover_image;
    });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Error verifying lookup OTP:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to verify code" });
  }
});
// ============================================
// GET USER'S TICKETS (Requires Auth)
// ============================================
router.get("/user/my-tickets", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT t.*,
        tt.id as ticket_type_id, tt.name as ticket_type_name, tt.price,
        e.id as event_id, e.title, e.venue_name, e.start_at, e.end_at, e.cover_image,
        o.id as order_id, o.buyer_name, o.payment_reference
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN events e ON t.event_id = e.id
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE o.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId]
    );

    const tickets = rows.map(t => ({
      ...t,
      ticket_type: {
        id: t.ticket_type_id,
        name: t.ticket_type_name,
        price: t.price,
      },
      event: {
        id: t.event_id,
        title: t.title,
        venue_name: t.venue_name,
        start_at: t.start_at,
        end_at: t.end_at,
        cover_image: t.cover_image,
      },
      order: {
        id: t.order_id,
        buyer_name: t.buyer_name,
        payment_reference: t.payment_reference,
      }
    }));

    res.json({ success: true, tickets });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
});

// ============================================
// CHECK IN TICKET (Requires Auth + Organizer Permissions)
// ============================================
router.post("/:code/check-in", requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    // Get ticket with event organizer info
    const [ticketRows] = await pool.query(
      `SELECT t.*, e.user_id, e.title
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.id
       WHERE t.code = ?`,
      [code]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    const ticket = ticketRows[0];

    // Check if user is the organizer
    if (ticket.user_id !== userId) {
      return res.status(403).json({ success: false, message: "You don't have permission to check in this ticket" });
    }

    if (ticket.checked_in) {
      return res.status(400).json({ success: false, message: "Ticket already checked in" });
    }

    if (ticket.transferred_at) {
      return res.status(400).json({ success: false, message: "Ticket has been transferred and cannot be checked in" });
    }

    // Check in
    await pool.query(
      `UPDATE tickets SET checked_in = 1, checked_in_at = NOW() WHERE id = ?`,
      [ticket.id]
    );

    // Fetch updated ticket
    const [updatedRows] = await pool.query(`SELECT * FROM tickets WHERE id = ?`, [ticket.id]);

    res.json({
      success: true,
      message: "Ticket checked in successfully",
      ticket: updatedRows[0],
    });
  } catch (error) {
    console.error("Error checking in ticket:", error);
    res.status(500).json({ success: false, message: "Failed to check in ticket" });
  }
});

export default router;