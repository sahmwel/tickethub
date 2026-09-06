// backend/routes/users.js
import { Router } from "express";
import pool from "../lib/db.js";
import { getOrCreateWallet, getWalletBalance } from "../lib/wallet.js";

const router = Router();

// ============================================
// GET CURRENT USER PROFILE (Self)
// ============================================
router.get("/me", async (req, res) => {
  try {
    const user = req.user;
    const profile = req.profile;

    let walletBalance = 0;
    try {
      walletBalance = await getWalletBalance(user.id);
    } catch (walletErr) {
      console.warn("⚠️ Could not fetch wallet balance:", walletErr.message);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ...profile,
        wallet_balance: walletBalance,
      }
    });
  } catch (err) {
    console.error("❌ Error getting user profile:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to get user profile" 
    });
  }
});

// ============================================
// GET ALL USERS (Admin only)
// ============================================
router.get("/", async (req, res) => {
  const { profile } = req;
  
  if (profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    const [rows] = await pool.query(`SELECT * FROM profiles ORDER BY created_at DESC`);
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET USER BY ID
// ============================================
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;

  if (user.id !== userId && profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  try {
    const [profileRows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    if (profileRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const userProfile = profileRows[0];

    let walletBalance = 0;
    try {
      walletBalance = await getWalletBalance(userId);
    } catch (walletErr) {
      console.warn("⚠️ Could not fetch wallet balance:", walletErr.message);
    }

    // Orders count
    const [orderCount] = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE buyer_email = ? AND status = 'paid'`,
      [userProfile.email]
    );
    // Tickets count (by holder_name)
    const [ticketCount] = await pool.query(
      `SELECT COUNT(*) as count FROM tickets WHERE holder_name = ?`,
      [userProfile.full_name]
    );

    res.json({
      success: true,
      user: {
        ...userProfile,
        wallet_balance: walletBalance,
        stats: {
          orders: orderCount[0].count || 0,
          tickets: ticketCount[0].count || 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// UPDATE USER PROFILE
// ============================================
router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;
  const { full_name, phone, country, avatar_url } = req.body;

  if (user.id !== userId && profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  try {
    const updates = [];
    const values = [];
    if (full_name !== undefined) { updates.push("full_name = ?"); values.push(full_name); }
    if (phone !== undefined) { updates.push("phone = ?"); values.push(phone); }
    if (country !== undefined) { updates.push("country = ?"); values.push(country); }
    if (avatar_url !== undefined) { updates.push("avatar_url = ?"); values.push(avatar_url); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }
    updates.push("updated_at = NOW()");
    values.push(userId);
    const [result] = await pool.query(
      `UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    res.json({ 
      success: true, 
      message: "Profile updated successfully.", 
      user: rows[0] 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// UPDATE USER ROLE (Admin only)
// ============================================
router.put("/:userId/role", async (req, res) => {
  const { userId } = req.params;
  const { profile } = req;
  const { role } = req.body;

  if (profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  if (!role || !["attendee", "organizer", "admin"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role." });
  }

  try {
    const [result] = await pool.query(
      `UPDATE profiles SET role = ?, updated_at = NOW() WHERE id = ?`,
      [role, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const [rows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    res.json({ 
      success: true, 
      message: "Role updated successfully.", 
      user: rows[0] 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET USER'S ORDERS
// ============================================
router.get("/:userId/orders", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;

  if (user.id !== userId && profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  try {
    const [profileRows] = await pool.query(`SELECT email FROM profiles WHERE id = ?`, [userId]);
    if (profileRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const userEmail = profileRows[0].email;

    const [orderRows] = await pool.query(
      `SELECT o.*,
              e.id as event_id,
              e.title as event_title,
              e.slug as event_slug,
              e.venue_name as event_venue_name,
              e.city as event_city,
              e.start_at as event_start_at,
              e.cover_image as event_cover_image
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.buyer_email = ?
       ORDER BY o.created_at DESC`,
      [userEmail]
    );

    if (orderRows.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orderIds = orderRows.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    // Fetch tickets for these orders
    const [ticketRows] = await pool.query(
      `SELECT t.*
       FROM tickets t
       WHERE t.order_id IN (${placeholders})`,
      orderIds
    );

    const ticketsByOrder = {};
    for (const t of ticketRows) {
      if (!ticketsByOrder[t.order_id]) ticketsByOrder[t.order_id] = [];
      ticketsByOrder[t.order_id].push({
        id: t.id,
        holder_name: t.holder_name,
        code: t.code,
        checked_in: t.checked_in,
        transferred_at: t.transferred_at,
      });
    }

    const orders = orderRows.map((o) => ({
      ...o,
      event: {
        id: o.event_id,
        title: o.event_title,
        slug: o.event_slug,
        venue_name: o.event_venue_name,
        city: o.event_city,
        start_at: o.event_start_at,
        cover_image: o.event_cover_image,
      },
      tickets: ticketsByOrder[o.id] || [],
    }));

    // Clean up extra fields
    orders.forEach(o => {
      delete o.event_id;
      delete o.event_title;
      delete o.event_slug;
      delete o.event_venue_name;
      delete o.event_city;
      delete o.event_start_at;
      delete o.event_cover_image;
    });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET USER'S TICKETS
// ============================================
router.get("/:userId/tickets", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;

  if (user.id !== userId && profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  try {
    const [profileRows] = await pool.query(`SELECT full_name FROM profiles WHERE id = ?`, [userId]);
    if (profileRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const fullName = profileRows[0].full_name;

    const [rows] = await pool.query(
      `SELECT t.*,
        tt.id as ticket_type_id, tt.name as ticket_type_name, tt.price,
        o.buyer_name, o.buyer_email, o.payment_reference,
        e.id as event_id, e.title, e.slug, e.venue_name, e.city, e.start_at, e.cover_image
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       LEFT JOIN orders o ON t.order_id = o.id
       LEFT JOIN events e ON t.event_id = e.id
       WHERE t.holder_name = ?
       ORDER BY t.created_at DESC`,
      [fullName]
    );

    const tickets = rows.map(t => ({
      id: t.id,
      code: t.code,
      holder_name: t.holder_name,
      checked_in: t.checked_in,
      checked_in_at: t.checked_in_at,
      transferred_at: t.transferred_at,
      transferred_to_name: t.transferred_to_name,
      created_at: t.created_at,
      ticket_type: {
        id: t.ticket_type_id,
        name: t.ticket_type_name,
        price: t.price,
      },
      orders: {
        buyer_name: t.buyer_name,
        buyer_email: t.buyer_email,
        payment_reference: t.payment_reference,
      },
      events: {
        id: t.event_id,
        title: t.title,
        slug: t.slug,
        venue_name: t.venue_name,
        city: t.city,
        start_at: t.start_at,
        cover_image: t.cover_image,
      }
    }));

    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET USER'S WALLET TRANSACTIONS
// ============================================
router.get("/:userId/wallet", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;
  const { limit = 50, offset = 0 } = req.query;

  if (user.id !== userId && profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized." });
  }

  try {
    const wallet = await getOrCreateWallet(userId);
    const balance = wallet.balance;

    const [rows] = await pool.query(
      `SELECT * FROM wallet_transactions
       WHERE wallet_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [wallet.id, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ?`,
      [wallet.id]
    );
    const total = countRows[0].total;

    res.json({
      success: true,
      balance,
      transactions: rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// DELETE USER (Admin only)
// ============================================
router.delete("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { user, profile } = req;

  if (profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  if (user.id === userId) {
    return res.status(400).json({ success: false, message: "Cannot delete yourself." });
  }

  try {
    await pool.query(`DELETE FROM wallets WHERE user_id = ?`, [userId]);
    await pool.query(`DELETE FROM profiles WHERE id = ?`, [userId]);
    // If you have a separate users table for auth, delete from there as well.
    res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// GET USER STATS (Admin only)
// ============================================
router.get("/stats/all", async (req, res) => {
  const { profile } = req;

  if (profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    // Role counts
    const [roleRows] = await pool.query(
      `SELECT role, COUNT(*) as count FROM profiles GROUP BY role`
    );
    const totalUsers = roleRows.reduce((sum, r) => sum + r.count, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [newRows] = await pool.query(
      `SELECT COUNT(*) as count FROM profiles WHERE created_at >= ?`,
      [sevenDaysAgo.toISOString()]
    );

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        byRole: roleRows,
        newThisWeek: newRows[0].count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// SEARCH USERS (Admin only)
// ============================================
router.get("/search/:query", async (req, res) => {
  const { query } = req.params;
  const { profile } = req;

  if (profile?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM profiles
       WHERE full_name LIKE ? OR email LIKE ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${query}%`, `%${query}%`]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;