// backend/routes/analytics.js
import { Router } from "express";
import pool from "../lib/db.js";

const router = Router();

// ─── Organizer analytics ──────────────────────────────────────────
router.get("/organizer/:organizerId", async (req, res) => {
  const { organizerId } = req.params;
  const { timeframe = "30d" } = req.query;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // 1. Get all events for organizer (with ticket types)
    const [events] = await pool.query(
      `SELECT id, title, category, created_at, status FROM events WHERE organizer_id = ?`,
      [organizerId]
    );
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return res.json({
        success: true,
        analytics: {
          summary: { totalRevenue: 0, totalTicketsSold: 0, totalOrders: 0, averageOrderValue: 0 },
          events: { total: 0, live: 0, draft: 0 },
          categoryBreakdown: {},
          dailySales: {},
          topEvents: [],
          tierPerformance: {},
          timeframe,
        },
      });
    }

    // 2. Ticket sales (including ticket type prices)
    const [ticketSales] = await pool.query(
      `SELECT t.*, tt.price, tt.name as ticket_type_name
       FROM tickets t
       LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.event_id IN (?) AND t.created_at BETWEEN ? AND ?`,
      [eventIds, startISO, endISO]
    );

    // 3. Orders (paid) for these events
    const [orders] = await pool.query(
      `SELECT * FROM orders
       WHERE event_id IN (?) AND status = 'paid' AND created_at BETWEEN ? AND ?`,
      [eventIds, startISO, endISO]
    );

    // 4. Calculate metrics
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.amount_total || 0), 0);
    const totalTicketsSold = ticketSales.length;
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 5. Category breakdown (counts tickets per category)
    const categoryBreakdown = {};
    for (const event of events) {
      const count = ticketSales.filter(t => t.event_id === event.id).length;
      if (count > 0) {
        categoryBreakdown[event.category] = (categoryBreakdown[event.category] || 0) + count;
      }
    }

    // 6. Daily sales (group orders by date)
    const dailySales = {};
    for (const o of orders) {
      const date = new Date(o.created_at).toISOString().split('T')[0];
      dailySales[date] = (dailySales[date] || 0) + parseFloat(o.amount_total || 0);
    }

    // 7. Top events (by tickets sold)
    const topEvents = events.map(e => {
      const sold = ticketSales.filter(t => t.event_id === e.id).length;
      const rev = orders.filter(o => o.event_id === e.id).reduce((s, o) => s + parseFloat(o.amount_total || 0), 0);
      return { id: e.id, title: e.title, sold, revenue: rev };
    }).sort((a, b) => b.sold - a.sold).slice(0, 5);

    // 8. Ticket tier performance
    const tierPerformance = {};
    for (const t of ticketSales) {
      const tierName = t.ticket_type_name || "Unknown";
      tierPerformance[tierName] = (tierPerformance[tierName] || 0) + 1;
    }

    res.json({
      success: true,
      analytics: {
        summary: {
          totalRevenue,
          totalTicketsSold,
          totalOrders,
          averageOrderValue,
        },
        events: {
          total: events.length,
          live: events.filter(e => e.status === "published").length,
          draft: events.filter(e => e.status === "draft").length,
        },
        categoryBreakdown,
        dailySales,
        topEvents,
        tierPerformance,
        timeframe,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching organizer analytics:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Platform-wide analytics (admin only) ─────────────────────────
router.get("/admin/platform", async (req, res) => {
  const { user } = req;
  if (user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    // Total users
    const [[{ count: totalUsers }]] = await pool.query(`SELECT COUNT(*) as count FROM profiles`);
    const [[{ count: totalEvents }]] = await pool.query(`SELECT COUNT(*) as count FROM events`);
    const [[{ count: totalTickets }]] = await pool.query(`SELECT COUNT(*) as count FROM tickets`);

    // Total revenue from paid orders
    const [revenueRows] = await pool.query(`SELECT amount_total FROM orders WHERE status = 'paid'`);
    const totalRevenue = revenueRows.reduce((sum, o) => sum + parseFloat(o.amount_total || 0), 0);

    // Monthly growth (group orders by month)
    const [monthlyRows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount_total) as total
       FROM orders
       WHERE status = 'paid'
       GROUP BY month
       ORDER BY month ASC`
    );
    const monthlyGrowth = {};
    for (const row of monthlyRows) {
      monthlyGrowth[row.month] = parseFloat(row.total || 0);
    }

    // Top organizers (by number of published events, sorted)
    const [topOrganizers] = await pool.query(
      `SELECT p.id, p.full_name, COUNT(e.id) as event_count
       FROM profiles p
       LEFT JOIN events e ON p.id = e.organizer_id AND e.status = 'published'
       WHERE p.role = 'organizer'
       GROUP BY p.id
       ORDER BY event_count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      analytics: {
        platform: {
          totalUsers,
          totalEvents,
          totalTickets,
          totalRevenue,
        },
        monthlyGrowth,
        topOrganizers,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching platform analytics:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;