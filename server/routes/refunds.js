// backend/routes/refunds.js
import { Router } from "express";
import pool from "../lib/db.js";
import {
  sendRefundRequestEmail,
  sendRefundConfirmationEmail,
  sendRefundRejectedEmail
} from "../lib/mailer.js";
import { creditWallet } from "../lib/wallet.js";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── Multer storage for refund proof files ─────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/refund-proofs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload a JPG, PNG, GIF, PDF, or TXT file.'), false);
    }
  }
});

function getProofUrl(filename) {
  const baseUrl = process.env.APP_URL || 'http://localhost:4000';
  return `${baseUrl}/uploads/refund-proofs/${filename}`;
}

// ─── Request a refund ──────────────────────────────────────────────
router.post("/request", requireAuth, upload.single('proof'), async (req, res) => {
  const { orderId, reason, additionalInfo } = req.body;
  const { user } = req;
  const proofFile = req.file;

  if (!orderId || !reason || !additionalInfo || !proofFile) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: orderId, reason, additionalInfo, and proof file are required."
    });
  }

  try {
    // Fetch order details
    const [orderRows] = await pool.query(
      `SELECT o.*, e.title as event_title
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.id = ? AND o.buyer_email = ?`,
      [orderId, user.email]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const order = orderRows[0];

    // Only paid or partial orders are refundable
    if (order.status !== "paid" && order.status !== "partial") {
      return res.status(400).json({
        success: false,
        message: "Only paid or partially paid orders can be refunded."
      });
    }

    // Check for existing pending/approved refund
    const [existingRefund] = await pool.query(
      `SELECT id, status FROM refunds WHERE order_id = ? AND status IN ('pending', 'approved')`,
      [orderId]
    );
    if (existingRefund.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A refund request is already ${existingRefund[0].status} for this order.`
      });
    }

    const proofUrl = getProofUrl(proofFile.filename);

    // Insert refund record (using `proof_path`, not `proof_url`)
    const [result] = await pool.query(
      `INSERT INTO refunds
       (order_id, user_id, amount, reason, additional_info, proof_path, status, requested_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderId, user.id, order.amount_total, reason, additionalInfo, proofUrl]
    );

    const [refundRows] = await pool.query(`SELECT * FROM refunds WHERE id = ?`, [result.insertId]);
    const refund = refundRows[0];

    // Send email notification to admin
    await sendRefundRequestEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      orderId: order.id,
      amount: order.amount_total,
      reason: reason,
      additionalInfo: additionalInfo,
      proofUrl: proofUrl,
      userEmail: user.email,
      userName: user.full_name || "User",
    });

    res.json({
      success: true,
      message: "Refund request submitted successfully.",
      refund,
    });
  } catch (err) {
    console.error("Refund request error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: list all refunds ──────────────────────────────────────
router.get("/admin/all", requireAuth, async (req, res) => {
  const { user } = req;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              o.payment_reference,
              o.buyer_email,
              o.buyer_name,
              o.amount_total,
              e.title as event_title,
              p.email as user_email,
              p.full_name as user_full_name
       FROM refunds r
       LEFT JOIN orders o ON r.order_id = o.id
       LEFT JOIN events e ON o.event_id = e.id
       LEFT JOIN profiles p ON r.user_id = p.id
       ORDER BY r.requested_at DESC`
    );
    res.json({ success: true, refunds: rows });
  } catch (err) {
    console.error("Error fetching refunds:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Admin: process (approve/reject) a refund ─────────────────────
router.post("/admin/process", requireAuth, async (req, res) => {
  const { refundId, action } = req.body;
  const { user } = req;

  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  if (!refundId || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ success: false, message: "Invalid request." });
  }

  try {
    const [refundRows] = await pool.query(
      `SELECT r.*,
              o.payment_reference,
              o.buyer_email,
              o.buyer_name,
              o.amount_total,
              e.title as event_title
       FROM refunds r
       LEFT JOIN orders o ON r.order_id = o.id
       LEFT JOIN events e ON o.event_id = e.id
       WHERE r.id = ?`,
      [refundId]
    );
    if (refundRows.length === 0) {
      return res.status(404).json({ success: false, message: "Refund not found." });
    }
    const refund = refundRows[0];

    if (refund.status !== "pending") {
      return res.status(400).json({ success: false, message: "Refund already processed." });
    }

    if (action === "approve") {
      const amountToRefund = parseFloat(refund.amount);
      const userId = refund.user_id;

      // Credit the user's wallet
      const walletResult = await creditWallet(
        userId,
        amountToRefund,
        `REFUND-${refund.id}-${Date.now()}`,
        `Refund for order ${refund.payment_reference}`,
        { orderId: refund.order_id }
      );

      if (!walletResult) {
        throw new Error("Failed to credit wallet.");
      }

      // Update order status
      await pool.query(
        `UPDATE orders SET status = 'refunded', refunded_at = NOW() WHERE id = ?`,
        [refund.order_id]
      );

      // Update refund record
      await pool.query(
        `UPDATE refunds
         SET status = 'approved',
             processed_at = NOW(),
             processed_by = ?,
             refund_reference = ?
         WHERE id = ?`,
        [user.id, walletResult.transaction.reference, refundId]
      );

      // If there are ticket IDs, mark them as refunded
      if (refund.ticket_ids) {
        const ticketIds = JSON.parse(refund.ticket_ids || '[]');
        if (ticketIds.length > 0) {
          await pool.query(
            `UPDATE tickets SET status = 'refunded' WHERE id IN (?)`,
            [ticketIds]
          );
        }
      }

      // Send confirmation email to user
      await sendRefundConfirmationEmail({
        to: refund.buyer_email,
        orderId: refund.order_id,
        amount: amountToRefund,
        refundReference: walletResult.transaction.reference,
        walletBalance: walletResult.wallet.balance,
      });

      res.json({
        success: true,
        message: "Refund approved and wallet credited.",
        walletBalance: walletResult.wallet.balance,
      });
    } else {
      // Reject
      await pool.query(
        `UPDATE refunds
         SET status = 'rejected',
             processed_at = NOW(),
             processed_by = ?
         WHERE id = ?`,
        [user.id, refundId]
      );

      // Send rejection email
      await sendRefundRejectedEmail({
        to: refund.buyer_email,
        orderId: refund.order_id,
        reason: refund.reason,
      });

      res.json({ success: true, message: "Refund rejected." });
    }
  } catch (err) {
    console.error("Admin process refund error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;