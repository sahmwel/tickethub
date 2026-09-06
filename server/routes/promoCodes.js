// backend/routes/promoCodes.js
import { Router } from "express";
import pool from "../lib/db.js";
import { nanoid } from "nanoid";

const router = Router();

router.post("/create", async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    eventId,
    maxUses,
    expiresAt,
    minOrderAmount,
  } = req.body;
  const { user } = req;

  if (user.role !== "organizer" && user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  if (!discountType || !discountValue) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    // ✅ Fixed: Changed 'user_id' to 'organizer_id' to match your events table
    if (eventId && user.role === "organizer") {
      const [eventRows] = await pool.query(
        `SELECT organizer_id FROM events WHERE id = ?`,
        [eventId]
      );
      // ✅ Fixed: Changed 'user_id' to 'organizer_id' in the check
      if (eventRows.length === 0 || eventRows[0].organizer_id !== user.id) {
        return res.status(403).json({ success: false, message: "You don't own this event." });
      }
    }

    const promoCode = code || nanoid(8).toUpperCase();

    const [result] = await pool.query(
      `INSERT INTO promo_codes
       (code, discount_type, discount_value, event_id, max_uses, used_count, expires_at, min_order_amount, created_by, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NOW(), 1)`,
      [promoCode, discountType, discountValue, eventId || null, maxUses || null, expiresAt || null, minOrderAmount || 0, user.id]
    );

    const [promoRows] = await pool.query(`SELECT * FROM promo_codes WHERE id = ?`, [result.insertId]);
    res.json({ success: true, promoCode: promoRows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/validate", async (req, res) => {
  const { code, eventId, amount } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: "Promo code required." });
  }

  try {
    const [promoRows] = await pool.query(
      `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1`,
      [code.toUpperCase()]
    );
    if (promoRows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or expired promo code." });
    }
    const promo = promoRows[0];

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Promo code has expired." });
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return res.status(400).json({ success: false, message: "Promo code has reached its usage limit." });
    }
    if (promo.event_id && promo.event_id !== eventId) {
      return res.status(400).json({ success: false, message: "Promo code is not valid for this event." });
    }
    if (promo.min_order_amount && amount < promo.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ${promo.min_order_amount} required.`
      });
    }

    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = (amount * promo.discount_value) / 100;
    } else {
      discountAmount = Math.min(promo.discount_value, amount);
    }

    res.json({
      success: true,
      promo: {
        ...promo,
        discountAmount,
        finalAmount: amount - discountAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/apply", async (req, res) => {
  const { code, orderId } = req.body;

  try {
    const [orderRows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const order = orderRows[0];

    const [promoRows] = await pool.query(`SELECT * FROM promo_codes WHERE code = ? AND is_active = 1`, [code.toUpperCase()]);
    if (promoRows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid promo code." });
    }
    const promo = promoRows[0];

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Promo code has expired." });
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return res.status(400).json({ success: false, message: "Promo code usage limit reached." });
    }
    if (promo.event_id && promo.event_id !== order.event_id) {
      return res.status(400).json({ success: false, message: "Promo code not valid for this event." });
    }
    if (promo.min_order_amount && order.amount_total < promo.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ${promo.min_order_amount} required.`
      });
    }

    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = (order.amount_total * promo.discount_value) / 100;
    } else {
      discountAmount = Math.min(promo.discount_value, order.amount_total);
    }

    const finalAmount = order.amount_total - discountAmount;

    await pool.query(
      `UPDATE orders SET promo_code = ?, discount_amount = ?, amount_total = ? WHERE id = ?`,
      [code.toUpperCase(), discountAmount, finalAmount, orderId]
    );

    await pool.query(
      `UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?`,
      [code.toUpperCase()]
    );

    res.json({
      success: true,
      message: "Promo code applied successfully.",
      finalAmount,
      discountAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;