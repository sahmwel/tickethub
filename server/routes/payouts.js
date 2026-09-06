// backend/routes/payouts.js
import { Router } from "express";
import pool from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT p.*,
              e.id as event_id, e.title as event_title, e.slug
       FROM payouts p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.organizer_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );
    const payouts = rows.map(p => ({
      ...p,
      event: p.event_id ? { id: p.event_id, title: p.event_title, slug: p.slug } : null,
    }));
    res.json({ success: true, payouts: payouts || [] });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch payouts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT p.*,
              e.id as event_id, e.title as event_title, e.slug
       FROM payouts p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.id = ? AND p.organizer_id = ?`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    const payout = rows[0];
    payout.event = payout.event_id ? { id: payout.event_id, title: payout.event_title, slug: payout.slug } : null;
    res.json({ success: true, payout });
  } catch (error) {
    console.error("Error fetching payout:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch payout" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [payoutRows] = await pool.query(
      `SELECT amount, status FROM payouts WHERE organizer_id = ?`,
      [userId]
    );
    const stats = { total: 0, pending: 0, completed: 0, failed: 0, count: payoutRows.length };
    payoutRows.forEach((payout) => {
      stats.total += parseFloat(payout.amount || 0);
      if (payout.status === "pending") stats.pending += parseFloat(payout.amount || 0);
      else if (payout.status === "completed") stats.completed += parseFloat(payout.amount || 0);
      else if (payout.status === "failed") stats.failed += parseFloat(payout.amount || 0);
    });
    const [recentRows] = await pool.query(
      `SELECT p.*, e.title as event_title
       FROM payouts p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.organizer_id = ?
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [userId]
    );
    res.json({ success: true, stats, recent: recentRows || [] });
  } catch (error) {
    console.error("Error fetching payout stats:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch payout stats" });
  }
});

router.post("/request", requireAuth, async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    const userId = req.user.id;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    if (!bankAccountId) {
      return res.status(400).json({ success: false, message: "Bank account is required" });
    }

    const [walletRows] = await pool.query(`SELECT balance FROM wallets WHERE organizer_id = ?`, [userId]);
    if (walletRows.length === 0) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }
    if (parseFloat(walletRows[0].balance) < amount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    const [bankRows] = await pool.query(
      `SELECT * FROM bank_accounts WHERE id = ? AND organizer_id = ?`,
      [bankAccountId, userId]
    );
    if (bankRows.length === 0) {
      return res.status(404).json({ success: false, message: "Bank account not found" });
    }
    const bankAccount = bankRows[0];

    const reference = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [result] = await pool.query(
      `INSERT INTO payouts
       (organizer_id, amount, currency, status, reference, bank_account_id, bank_name, account_number, account_name, description, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        amount,
        bankAccount.currency || "NGN",
        reference,
        bankAccountId,
        bankAccount.bank_name,
        bankAccount.account_number,
        bankAccount.account_name,
        `Payout request to ${bankAccount.bank_name}`
      ]
    );
    await pool.query(`UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE organizer_id = ?`, [amount, userId]);

    const [payoutRows] = await pool.query(`SELECT * FROM payouts WHERE id = ?`, [result.insertId]);
    res.json({ success: true, message: "Payout request submitted successfully", payout: payoutRows[0] });
  } catch (error) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to request payout" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [payoutRows] = await pool.query(
      `SELECT * FROM payouts WHERE id = ? AND organizer_id = ?`,
      [id, userId]
    );
    if (payoutRows.length === 0) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    const payout = payoutRows[0];
    if (payout.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending payouts can be cancelled" });
    }
    await pool.query(`UPDATE payouts SET status = 'cancelled', updated_at = NOW() WHERE id = ?`, [id]);
    await pool.query(`UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE organizer_id = ?`, [payout.amount, userId]);
    res.json({ success: true, message: "Payout cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling payout:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to cancel payout" });
  }
});

export default router;