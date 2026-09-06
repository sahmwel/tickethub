// backend/routes/reviews.js
import { Router } from "express";
import pool from "../lib/db.js";

const router = Router();

// Submit review
router.post("/submit", async (req, res) => {
  const { eventId, rating, comment, ticketId } = req.body;
  const { user } = req;

  if (!eventId || !rating) {
    return res.status(400).json({ success: false, message: "Event ID and rating required." });
  }

  try {
    // Check if user has attended (ticket checked in)
    const [ticketRows] = await pool.query(
      `SELECT id FROM tickets WHERE id = ? AND event_id = ? AND checked_in = 1`,
      [ticketId, eventId]
    );
    if (ticketRows.length === 0) {
      return res.status(403).json({ success: false, message: "You must attend the event to review it." });
    }

    // Check if already reviewed
    const [existing] = await pool.query(
      `SELECT id FROM reviews WHERE event_id = ? AND user_id = ?`,
      [eventId, user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You already reviewed this event." });
    }

    // Insert review
    const [result] = await pool.query(
      `INSERT INTO reviews (event_id, user_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [eventId, user.id, Math.min(5, Math.max(1, rating)), comment || null]
    );

    // Get the inserted review with profile info
    const [reviewRows] = await pool.query(
      `SELECT r.*, p.full_name, p.avatar_url
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.id = ?`,
      [result.insertId]
    );
    const review = reviewRows[0];

    // Update event average rating and total reviews
    const [allReviews] = await pool.query(
      `SELECT rating FROM reviews WHERE event_id = ?`,
      [eventId]
    );
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await pool.query(
      `UPDATE events SET average_rating = ?, total_reviews = ? WHERE id = ?`,
      [avgRating, allReviews.length, eventId]
    );

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get event reviews
router.get("/event/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT r.*, p.full_name, p.avatar_url
       FROM reviews r
       LEFT JOIN profiles p ON r.user_id = p.id
       WHERE r.event_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM reviews WHERE event_id = ?`,
      [eventId]
    );
    const total = countRows[0].total;

    res.json({
      success: true,
      reviews: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get event rating summary
router.get("/summary/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT rating FROM reviews WHERE event_id = ?`,
      [eventId]
    );
    const total = rows.length;
    const average = total > 0
      ? rows.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    // Rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    res.json({
      success: true,
      summary: {
        average,
        total,
        distribution,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;