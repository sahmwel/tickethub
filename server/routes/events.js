// backend/routes/events.js
import { Router } from "express";
import { randomUUID } from "crypto";
import pool from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { fetchEventsWithTicketTypes } from "../lib/aggregate.js";

const router = Router();

// ─── Helper to parse JSON ticket_types (if any) ──────────────────
function parseTicketTypes(event) {
  if (event && event.ticket_types && typeof event.ticket_types === 'string') {
    try {
      event.ticket_types = JSON.parse(event.ticket_types);
    } catch {
      event.ticket_types = [];
    }
  }
  return event;
}

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────

// GET /api/events – all published events
router.get("/", async (req, res) => {
  try {
    // Fetch events with formatted dates (raw strings)
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published'
      ORDER BY e.start_at ASC
    `);

    // Replace the Date objects with raw strings
    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    // Fetch ticket types for each event (same logic as fetchEventsWithTicketTypes)
    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching all events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/upcoming
router.get("/upcoming", async (req, res) => {
  const limit = parseInt(req.query.limit) || 3;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published' AND e.start_at > NOW()
      ORDER BY e.start_at ASC
      LIMIT ?
    `, [limit]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    // Fetch ticket types for these events
    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching upcoming events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/new
router.get("/new", async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published'
      ORDER BY e.created_at DESC
      LIMIT ?
    `, [limit]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching new events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/trending
router.get("/trending", async (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw,
        (SELECT SUM(quantity_sold) FROM ticket_types WHERE event_id = e.id) as total_sold
      FROM events e
      WHERE e.status = 'published'
      ORDER BY total_sold DESC
      LIMIT ?
    `, [limit]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching trending events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/featured
router.get("/featured", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published' AND e.is_featured = 1 AND e.start_at > NOW()
      ORDER BY e.start_at ASC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.json({ success: true, event: null });
    }

    const row = rows[0];
    const event = {
      ...row,
      start_at: row.start_at_raw,
      end_at: row.end_at_raw,
    };
    delete event.start_at_raw;
    delete event.end_at_raw;

    // Fetch ticket types for this event
    const [ticketRows] = await pool.query(`
      SELECT 
        id,
        name,
        price,
        quantity_total,
        quantity_sold,
        max_per_order,
        allow_installments,
        installment_plan
      FROM ticket_types
      WHERE event_id = ?
    `, [event.id]);
    event.ticket_types = ticketRows || [];

    res.json({ success: true, event });
  } catch (err) {
    console.error("Error fetching featured event:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/sponsored
router.get("/sponsored", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published' AND e.is_sponsored = 1
      ORDER BY e.start_at ASC
      LIMIT ?
    `, [limit]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching sponsored events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/category/:category
router.get("/category/:category", async (req, res) => {
  const { category } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published' AND e.category = ?
      ORDER BY e.start_at ASC
    `, [category]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching events by category:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/search
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, message: "Missing search query" });
  }
  try {
    const searchTerm = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.status = 'published' 
        AND (e.title LIKE ? OR e.venue_name LIKE ? OR e.city LIKE ?)
      ORDER BY e.start_at ASC
    `, [searchTerm, searchTerm, searchTerm]);

    const eventsRaw = rows.map(row => {
      const event = { ...row };
      event.start_at = event.start_at_raw;
      event.end_at = event.end_at_raw;
      delete event.start_at_raw;
      delete event.end_at_raw;
      return event;
    });

    const eventIds = eventsRaw.map(e => e.id);
    let ticketsByEvent = {};
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [ticketRows] = await pool.query(`
        SELECT 
          event_id,
          id,
          name,
          price,
          quantity_total,
          quantity_sold,
          max_per_order,
          allow_installments,
          installment_plan
        FROM ticket_types
        WHERE event_id IN (${placeholders})
      `, eventIds);
      for (const t of ticketRows) {
        if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
        ticketsByEvent[t.event_id].push({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          max_per_order: t.max_per_order,
          allow_installments: t.allow_installments,
          installment_plan: t.installment_plan,
        });
      }
    }

    const events = eventsRaw.map(e => ({
      ...e,
      ticket_types: ticketsByEvent[e.id] || [],
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error searching events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/slug/:slug
router.get("/slug/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        DATE_FORMAT(e.start_at, '%Y-%m-%d %H:%i:%s') as start_at_raw,
        DATE_FORMAT(e.end_at, '%Y-%m-%d %H:%i:%s') as end_at_raw
      FROM events e
      WHERE e.slug = ? AND e.status = 'published'
    `, [slug]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const row = rows[0];
    const event = {
      ...row,
      start_at: row.start_at_raw,
      end_at: row.end_at_raw,
    };
    delete event.start_at_raw;
    delete event.end_at_raw;

    // Fetch ticket types
    const [ticketRows] = await pool.query(`
      SELECT 
        id,
        name,
        price,
        quantity_total,
        quantity_sold,
        max_per_order,
        allow_installments,
        installment_plan
      FROM ticket_types
      WHERE event_id = ?
    `, [event.id]);
    event.ticket_types = ticketRows || [];

    res.json({ success: true, event });
  } catch (err) {
    console.error("Error fetching event by slug:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/events/count
router.get("/count", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM events WHERE status = 'published'`);
    const [sampleRows] = await pool.query(
      `SELECT id, title, status, is_verified, is_sponsored, is_featured, is_new_drop, 
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
              DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') as start_at
       FROM events LIMIT 5`
    );
    res.json({ success: true, count: rows[0].count, sample: sampleRows });
  } catch (err) {
    console.error("Error counting events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── AUTHENTICATED ROUTES ──────────────────────────────────────────

// GET /api/events/:eventId – full event details (for organizer's own event)
router.get("/:eventId", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const sql = `
      SELECT e.*
      FROM events e
      WHERE e.id = ? AND e.organizer_id = ?
    `;
    const events = await fetchEventsWithTicketTypes(sql, [eventId, req.user.id]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.json({ success: true, event: events[0] });
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events – create a new event (with ticket types)
router.post("/", requireAuth, async (req, res) => {
  const {
    title,
    slug,
    description,
    category,
    cover_image,
    past_gallery,
    venue_name,
    address,
    city,
    country,
    currency,
    timezone,
    start_at,
    end_at,
    status,
    fee_bearer,
    is_featured,
    is_sponsored,
    is_new_drop,
    guest_artiste,
    guest_artiste_image,
    contact_email,
    contact_phone,
    paystack_subaccount_override,
    flutterwave_subaccount_override,
    ticket_types,
  } = req.body;

  const organizerId = req.user.id;
  const eventId = randomUUID();

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query(
      `INSERT INTO events (
        id, organizer_id, title, slug, description, category, cover_image, past_gallery,
        venue_name, address, city, country, currency, timezone, start_at, end_at,
        status, fee_bearer, is_featured, is_sponsored, is_new_drop,
        guest_artiste, guest_artiste_image, contact_email, contact_phone,
        paystack_subaccount_override, flutterwave_subaccount_override,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        eventId, organizerId, title, slug, description, category, cover_image || null,
        past_gallery ? JSON.stringify(past_gallery) : null,
        venue_name, address, city, country, currency, timezone, start_at, end_at || null,
        status || 'draft', fee_bearer || 'attendee', is_featured || 0, is_sponsored || 0, is_new_drop || 0,
        guest_artiste || null, guest_artiste_image || null, contact_email || null, contact_phone || null,
        paystack_subaccount_override || null, flutterwave_subaccount_override || null
      ]
    );

    if (ticket_types && Array.isArray(ticket_types) && ticket_types.length > 0) {
      const insertValues = ticket_types.map((t) => [
        eventId,
        t.name,
        t.price,
        t.quantity_total,
        t.max_per_order || 10,
        t.allow_installments ? 1 : 0,
        t.installment_plan ? JSON.stringify(t.installment_plan) : null,
        0,
      ]);
      await connection.query(
        `INSERT INTO ticket_types (event_id, name, price, quantity_total, max_per_order, allow_installments, installment_plan, quantity_sold)
         VALUES ?`,
        [insertValues]
      );
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, eventId });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error creating event:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:eventId – update event (with ticket types)
router.put("/:eventId", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const {
    title,
    description,
    category,
    cover_image,
    past_gallery,
    venue_name,
    address,
    city,
    country,
    currency,
    timezone,
    start_at,
    end_at,
    fee_bearer,
    is_featured,
    is_sponsored,
    is_new_drop,
    guest_artiste,
    guest_artiste_image,
    contact_email,
    contact_phone,
    paystack_subaccount_override,
    flutterwave_subaccount_override,
    ticket_types,
  } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query(
      `UPDATE events SET
        title = ?, description = ?, category = ?, cover_image = ?, past_gallery = ?,
        venue_name = ?, address = ?, city = ?, country = ?, currency = ?, timezone = ?,
        start_at = ?, end_at = ?, fee_bearer = ?, is_featured = ?, is_sponsored = ?, is_new_drop = ?,
        guest_artiste = ?, guest_artiste_image = ?, contact_email = ?, contact_phone = ?,
        paystack_subaccount_override = ?, flutterwave_subaccount_override = ?,
        updated_at = NOW()
       WHERE id = ? AND organizer_id = ?`,
      [
        title, description, category, cover_image || null,
        past_gallery ? JSON.stringify(past_gallery) : null,
        venue_name, address, city, country, currency, timezone,
        start_at, end_at || null, fee_bearer || 'attendee',
        is_featured || 0, is_sponsored || 0, is_new_drop || 0,
        guest_artiste || null, guest_artiste_image || null,
        contact_email || null, contact_phone || null,
        paystack_subaccount_override || null, flutterwave_subaccount_override || null,
        eventId, req.user.id
      ]
    );

    if (ticket_types && Array.isArray(ticket_types)) {
      await connection.query(`DELETE FROM ticket_types WHERE event_id = ?`, [eventId]);

      const insertValues = ticket_types.map((t) => [
        eventId,
        t.name,
        t.price,
        t.quantity_total,
        t.max_per_order || 10,
        t.allow_installments ? 1 : 0,
        t.installment_plan ? JSON.stringify(t.installment_plan) : null,
        0,
      ]);
      if (insertValues.length > 0) {
        await connection.query(
          `INSERT INTO ticket_types (event_id, name, price, quantity_total, max_per_order, allow_installments, installment_plan, quantity_sold)
           VALUES ?`,
          [insertValues]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error updating event:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;