// backend/routes/installment.js
import { Router } from "express";
import pool from "../lib/db.js";
import { processFailedInstallment, checkExpiredInstallments } from "../lib/wallet.js";

const router = Router();

// Process failed installment manually (user or admin)
router.post("/:orderId/fail", async (req, res) => {
  const { orderId } = req.params;
  const { user } = req;

  try {
    // Verify order belongs to user
    const [rows] = await pool.query(
      `SELECT id FROM orders WHERE id = ? AND buyer_email = ?`,
      [orderId, user.email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const result = await processFailedInstallment(orderId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: check expired installments
router.post("/check-expired", async (req, res) => {
  const { user } = req;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }

  try {
    const result = await checkExpiredInstallments();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;