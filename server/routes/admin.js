// backend/routes/admin.js
import fetch from "node-fetch";
import { Router } from "express";
import pool from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { creditWallet } from "../lib/wallet.js";
import {
  sendRefundConfirmationEmail,
  sendRefundRejectedEmail,
} from "../lib/mailer.js";

const router = Router();

router.use(requireAuth, requireAdmin);

// ─── PLATFORM OVERVIEW ────────────────────────────────────────────────
router.get("/overview", async (req, res) => {
  try {
    const [eventCount] = await pool.query(`SELECT COUNT(*) as count FROM events`);
    const [orgCount] = await pool.query(`SELECT COUNT(*) as count FROM profiles WHERE role = 'organizer'`);
    const [orderRows] = await pool.query(`SELECT amount_total FROM orders WHERE status = 'paid'`);
    const totalRevenue = orderRows.reduce((sum, o) => sum + parseFloat(o.amount_total || 0), 0);
    const [refundRows] = await pool.query(`SELECT status, amount FROM refunds`);
    const refundStats = {
      totalRefunded: refundRows
        .filter(r => r.status === "approved")
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      pending: refundRows.filter(r => r.status === "pending").length,
      approved: refundRows.filter(r => r.status === "approved").length,
      rejected: refundRows.filter(r => r.status === "rejected").length,
    };

    return res.json({
      success: true,
      overview: {
        eventsCount: eventCount[0].count || 0,
        organizersCount: orgCount[0].count || 0,
        totalRevenue,
        paidOrdersCount: orderRows.length,
        refundStats,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching admin overview:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch overview" });
  }
});

// ─── LIST ALL REFUND REQUESTS ──────────────────────────────────────
router.get("/refunds", async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT r.*,
             o.payment_reference, o.buyer_email, o.buyer_name, o.amount_total,
             e.title as event_title,
             p.email, p.full_name as profile_full_name
      FROM refunds r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN events e ON o.event_id = e.id
      LEFT JOIN profiles p ON r.user_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== "all") {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY r.requested_at DESC`;

    const [rows] = await pool.query(query, params);
    const refunds = rows.map(row => ({
      id: row.id,
      order_id: row.order_id,
      user_id: row.user_id,
      amount: row.amount,
      reason: row.reason,
      status: row.status,
      requested_at: row.requested_at,
      processed_at: row.processed_at,
      processed_by: row.processed_by,
      admin_note: row.admin_note,
      refund_reference: row.refund_reference,
      ticket_ids: row.ticket_ids ? JSON.parse(row.ticket_ids || '[]') : [],
      orders: {
        id: row.order_id,
        payment_reference: row.payment_reference,
        buyer_email: row.buyer_email,
        buyer_name: row.buyer_name,
        amount_total: row.amount_total,
        events: row.event_id ? {
          id: row.event_id,
          title: row.event_title,
        } : null,
      },
      profiles: {
        email: row.email,
        full_name: row.profile_full_name,
      }
    }));
    return res.json({ success: true, refunds });
  } catch (err) {
    console.error("❌ Error fetching refunds:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch refunds" });
  }
});

// ─── PROCESS A REFUND ──────────────────────────────────────────────
router.patch("/refunds/:refundId", async (req, res) => {
  const { refundId } = req.params;
  const { action, note } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
  }

  try {
    const [refundRows] = await pool.query(
      `SELECT r.*,
              o.payment_reference, o.buyer_email, o.buyer_name, o.amount_total,
              e.*,
              p.email, p.full_name
       FROM refunds r
       LEFT JOIN orders o ON r.order_id = o.id
       LEFT JOIN events e ON o.event_id = e.id
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.id = ?`,
      [refundId]
    );
    if (refundRows.length === 0) {
      return res.status(404).json({ success: false, message: "Refund not found" });
    }
    const refund = refundRows[0];
    if (refund.status !== "pending") {
      return res.status(400).json({ success: false, message: "Refund already processed" });
    }

    const adminId = req.user.id;

    if (action === "approve") {
      const amountToRefund = refund.amount;
      const userId = refund.user_id;
      const orderId = refund.order_id;

      const walletResult = await creditWallet(
        userId,
        amountToRefund,
        `REFUND-${refund.id}-${Date.now()}`,
        `Refund for order ${refund.payment_reference}`,
        { orderId }
      );
      if (!walletResult) throw new Error("Failed to credit wallet");

      await pool.query(
        `UPDATE orders SET status = 'refunded', refunded_at = NOW() WHERE id = ?`,
        [orderId]
      );

      await pool.query(
        `UPDATE refunds
         SET status = 'approved',
             processed_at = NOW(),
             processed_by = ?,
             admin_note = ?,
             refund_reference = ?
         WHERE id = ?`,
        [adminId, note || null, walletResult.transaction.reference, refundId]
      );

      if (refund.ticket_ids) {
        const ticketIds = JSON.parse(refund.ticket_ids || '[]');
        if (ticketIds.length > 0) {
          await pool.query(
            `UPDATE tickets SET status = 'refunded' WHERE id IN (?)`,
            [ticketIds]
          );
        }
      }

      const [updatedRefundRows] = await pool.query(
        `SELECT * FROM refunds WHERE id = ?`,
        [refundId]
      );
      const updatedRefund = updatedRefundRows[0];

      await sendRefundConfirmationEmail({
        to: refund.buyer_email,
        orderId: refund.order_id,
        amount: amountToRefund,
        refundReference: walletResult.transaction.reference,
        walletBalance: walletResult.wallet.balance,
      });

      return res.json({
        success: true,
        message: "Refund approved and wallet credited.",
        refund: updatedRefund,
        walletBalance: walletResult.wallet.balance,
      });
    }

    // Reject
    await pool.query(
      `UPDATE refunds
       SET status = 'rejected',
           processed_at = NOW(),
           processed_by = ?,
           admin_note = ?
       WHERE id = ?`,
      [adminId, note || null, refundId]
    );

    const [rejectedRefundRows] = await pool.query(
      `SELECT * FROM refunds WHERE id = ?`,
      [refundId]
    );
    const rejectedRefund = rejectedRefundRows[0];

    await sendRefundRejectedEmail({
      to: refund.buyer_email,
      orderId: refund.order_id,
      reason: note || refund.reason,
    });

    return res.json({
      success: true,
      message: "Refund rejected.",
      refund: rejectedRefund,
    });
  } catch (err) {
    console.error("❌ Error processing refund:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to process refund" });
  }
});

// ─── LIST ALL EVENTS (for review/verification) ────────────────────
router.get("/events", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*,
              p.full_name as organizer_full_name,
              p.email as organizer_email
       FROM events e
       LEFT JOIN profiles p ON e.organizer_id = p.id   -- ✅ fixed
       ORDER BY e.created_at DESC`
    );
    return res.json({ success: true, events: rows });
  } catch (err) {
    console.error("❌ Error fetching all events:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch events" });
  }
});

// ─── ALL USERS ──────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM profiles ORDER BY created_at DESC`);
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch users" });
  }
});

router.patch("/users/:userId/role", async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  if (!["attendee", "organizer", "admin"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }
  try {
    const [result] = await pool.query(
      `UPDATE profiles SET role = ? WHERE id = ?`,
      [role, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    return res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error("❌ Error updating user role:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update role" });
  }
});

// ─── PLATFORM SETTINGS ──────────────────────────────────────────────
router.get("/settings", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM platform_settings`);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return res.json({ success: true, settings });
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch settings" });
  }
});

router.patch("/settings", async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return res.status(400).json({ success: false, message: "Body must be a key-value object" });
  }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()`,
        [key, String(value), String(value)]
      );
    }
    return res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    console.error("❌ Error updating settings:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update settings" });
  }
});

// ─── PAYOUTS — SUMMARY ──────────────────────────────────────────────
router.get("/payouts/summary", async (req, res) => {
  try {
    const [organizers] = await pool.query(
      `SELECT id, full_name, email FROM profiles WHERE role = 'organizer'`
    );
    const summaries = await Promise.all(
      organizers.map(async (org) => {
        const [eventRows] = await pool.query(
          `SELECT id FROM events WHERE organizer_id = ?`,  // ✅ fixed
          [org.id]
        );
        const eventIds = eventRows.map(e => e.id);
        let totalRevenue = 0;
        if (eventIds.length > 0) {
          const [orderRows] = await pool.query(
            `SELECT amount_total FROM orders WHERE event_id IN (?) AND status = 'paid'`,
            [eventIds]
          );
          totalRevenue = orderRows.reduce((sum, o) => sum + parseFloat(o.amount_total || 0), 0);
        }
        const [payoutRows] = await pool.query(
          `SELECT amount, status FROM payouts WHERE organizer_id = ?`,
          [org.id]
        );
        const totalPaidOut = payoutRows
          .filter(p => p.status === "paid")
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalPending = payoutRows
          .filter(p => p.status === "pending")
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        return {
          organizerId: org.id,
          fullName: org.full_name,
          email: org.email,
          totalRevenue,
          totalPaidOut,
          totalPending,
          outstanding: totalRevenue - totalPaidOut,
        };
      })
    );
    return res.json({ success: true, summaries });
  } catch (err) {
    console.error("❌ Error building payout summary:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to build payout summary" });
  }
});

router.get("/payouts/:organizerId", async (req, res) => {
  const { organizerId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM payouts WHERE organizer_id = ? ORDER BY created_at DESC`,
      [organizerId]
    );
    return res.json({ success: true, payouts: rows });
  } catch (err) {
    console.error("❌ Error fetching payouts:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch payouts" });
  }
});

router.post("/payouts", async (req, res) => {
  const { organizerId, amount, periodStart, periodEnd, notes } = req.body;
  if (!organizerId || !amount || !periodStart || !periodEnd) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO payouts (organizer_id, amount, period_start, period_end, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [organizerId, amount, periodStart, periodEnd, notes || null]
    );
    const [rows] = await pool.query(`SELECT * FROM payouts WHERE id = ?`, [result.insertId]);
    return res.json({ success: true, payout: rows[0] });
  } catch (err) {
    console.error("❌ Error creating payout:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create payout" });
  }
});

router.patch("/payouts/:payoutId/mark-paid", async (req, res) => {
  const { payoutId } = req.params;
  try {
    const [result] = await pool.query(
      `UPDATE payouts SET status = 'paid', paid_at = NOW() WHERE id = ?`,
      [payoutId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM payouts WHERE id = ?`, [payoutId]);
    return res.json({ success: true, payout: rows[0] });
  } catch (err) {
    console.error("❌ Error marking payout paid:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update payout" });
  }
});

// ─── VERIFY / UNVERIFY EVENT ─────────────────────────────────────
router.patch("/events/:eventId/verify", async (req, res) => {
  const { eventId } = req.params;
  const { verified } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE events SET is_verified = ? WHERE id = ?`,
      [!!verified, eventId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM events WHERE id = ?`, [eventId]);
    return res.json({ success: true, event: rows[0] });
  } catch (err) {
    console.error("❌ Error updating verification:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update verification" });
  }
});

// ─── PUBLISH / UNPUBLISH / CANCEL EVENT ──────────────────────────
router.patch("/events/:eventId/status", async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  if (!["draft", "published", "cancelled"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  try {
    const [result] = await pool.query(
      `UPDATE events SET status = ? WHERE id = ?`,
      [status, eventId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM events WHERE id = ?`, [eventId]);
    return res.json({ success: true, event: rows[0] });
  } catch (err) {
    console.error("❌ Error updating event status:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to update status" });
  }
});

// ─── RECONCILIATION ──────────────────────────────────────────────────
router.get("/reconciliation", async (req, res) => {
  try {
    let paystackSettlements = [];
    if (process.env.PAYSTACK_SECRET_KEY) {
      const psRes = await fetch("https://api.paystack.co/settlement", {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      const psData = await psRes.json();
      if (psData.status) {
        paystackSettlements = (psData.data || []).map((s) => ({
          provider: "paystack",
          id: s.id,
          amount: s.total_amount / 100,
          status: s.status,
          settledAt: s.settlement_date || s.settled_at,
        }));
      }
    }

    let flutterwaveSettlements = [];
    if (process.env.FLUTTERWAVE_SECRET_KEY) {
      const fwRes = await fetch("https://api.flutterwave.com/v3/settlements", {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
      });
      const fwData = await fwRes.json();
      if (fwData.status === "success") {
        flutterwaveSettlements = (fwData.data || []).map((s) => ({
          provider: "flutterwave",
          id: s.id,
          amount: s.amount,
          status: s.approved ? "settled" : "pending",
          settledAt: s.created_at,
        }));
      }
    }

    const [payoutRows] = await pool.query(
      `SELECT p.*, pr.full_name
       FROM payouts p
       LEFT JOIN profiles pr ON p.organizer_id = pr.id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );

    return res.json({
      success: true,
      providerSettlements: [...paystackSettlements, ...flutterwaveSettlements],
      recordedPayouts: payoutRows,
    });
  } catch (err) {
    console.error("❌ Error fetching reconciliation data:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch reconciliation data" });
  }
});

// ─── SPONSORS ────────────────────────────────────────────────────────
router.get("/sponsors", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM sponsors ORDER BY sort_order ASC`);
    return res.json({ success: true, sponsors: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch sponsors" });
  }
});

router.post("/sponsors", async (req, res) => {
  const { name, logo_text, sort_order } = req.body;
  if (!name || !logo_text) {
    return res.status(400).json({ success: false, message: "name and logo_text are required" });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO sponsors (name, logo_text, sort_order) VALUES (?, ?, ?)`,
      [name, logo_text, sort_order ?? 0]
    );
    const [rows] = await pool.query(`SELECT * FROM sponsors WHERE id = ?`, [result.insertId]);
    return res.json({ success: true, sponsor: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to create sponsor" });
  }
});

router.patch("/sponsors/:id", async (req, res) => {
  const { id } = req.params;
  const { name, logo_text, sort_order } = req.body;
  try {
    const updates = [];
    const values = [];
    if (name) { updates.push("name = ?"); values.push(name); }
    if (logo_text) { updates.push("logo_text = ?"); values.push(logo_text); }
    if (sort_order !== undefined && sort_order !== null) { updates.push("sort_order = ?"); values.push(sort_order); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }
    values.push(id);
    const [result] = await pool.query(
      `UPDATE sponsors SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Sponsor not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM sponsors WHERE id = ?`, [id]);
    return res.json({ success: true, sponsor: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to update sponsor" });
  }
});

router.delete("/sponsors/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(`DELETE FROM sponsors WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Sponsor not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to delete sponsor" });
  }
});

export default router;