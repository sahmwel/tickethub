// backend/routes/orders.js
import { Router } from "express";
import pool from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/orders – lists the logged-in buyer's orders.
 */
router.get("/", requireAuth, async (req, res) => {
  const { user } = req;

  try {
    const [orderRows] = await pool.query(
      `SELECT o.*,
              e.title as event_title,
              e.slug as event_slug,
              e.start_at as event_start_at,
              e.venue_name as event_venue_name
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [user.id]
    );

    if (orderRows.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orderIds = orderRows.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    const [itemRows] = await pool.query(
      `SELECT order_id, quantity
       FROM order_items
       WHERE order_id IN (${placeholders})`,
      orderIds
    );

    const itemsByOrder = {};
    for (const item of itemRows) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({ quantity: item.quantity });
    }

    const formattedOrders = orderRows.map((order) => {
      const items = itemsByOrder[order.id] || [];
      return {
        id: order.id,
        reference: order.payment_reference,
        event_title: order.event_title || "Untitled event",
        event_slug: order.event_slug,
        event_date: order.event_start_at,
        venue: order.event_venue_name,
        ticket_count: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        amount_total: order.amount_total,
        amount_paid: order.amount_paid ?? order.amount_total,
        status: order.status,
        created_at: order.created_at,
      };
    });

    res.json({ success: true, orders: formattedOrders });
  } catch (err) {
    console.error("❌ Error listing orders:", err);
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch orders",
    });
  }
});

/**
 * POST /api/orders – create a pending order (with FULL TRANSACTION)
 */
router.post("/", requireAuth, async (req, res) => {
  const {
    eventId,
    ticketTypeId,
    quantity,
    buyerName,
    buyerEmail,
    buyerPhone,
    orderRef,
    holderNames,
    paymentPlan,
  } = req.body;

  const userId = req.user.id;

  if (!eventId || !ticketTypeId || !quantity || !buyerEmail || !orderRef) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Get ticket type (locked)
    const [ttRows] = await connection.query(
      `SELECT * FROM ticket_types WHERE id = ? FOR UPDATE`,
      [ticketTypeId]
    );
    if (ttRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "Ticket type not found." });
    }
    const ticketType = ttRows[0];

    // 2. Get event
    const [eventRows] = await connection.query(
      `SELECT fee_bearer, currency, timezone, title, venue_name, start_at, end_at FROM events WHERE id = ?`,
      [eventId]
    );
    if (eventRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "Event not found." });
    }
    const event = eventRows[0];

    // 3. Check availability
    const available = ticketType.quantity_total - ticketType.quantity_sold;
    if (quantity > available) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Not enough tickets remaining.",
        soldOut: available <= 0,
      });
    }

    // 4. Payment plan
    const plan = paymentPlan === "installment" ? "installment" : "full";
    if (plan === "installment" && !ticketType.allow_installments) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Installment payments aren't available for this ticket type.",
      });
    }

    // 5. Platform fee
    const [feeRows] = await pool.query(
      `SELECT value FROM platform_settings WHERE \`key\` = 'platform_fee_percent'`
    );
    const platformFeePercent = Number(feeRows[0]?.value ?? 5);

    const subtotal = ticketType.price * quantity;
    const feeAmount = event.fee_bearer === "attendee" ? Math.round(subtotal * (platformFeePercent / 100)) : 0;
    const amountTotal = subtotal + feeAmount;
    const currencyCode = event.currency || "NGN";

    // 6. Installment specifics
    const depositAmount = plan === "installment" ? Math.round(amountTotal / 2) : null;
    const balanceAmount = plan === "installment" ? amountTotal - depositAmount : null;
    let balanceDueAt = null;
    if (plan === "installment") {
      const eventStart = new Date(event.start_at);
      balanceDueAt = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    // 7. Build holder names
    const validHolderNames =
      Array.isArray(holderNames) && holderNames.length === quantity
        ? holderNames.map((n) => (n && n.trim() ? n.trim() : buyerName))
        : Array.from({ length: quantity }, () => buyerName);

    // 8. Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (user_id, event_id, buyer_id, buyer_name, buyer_email, buyer_phone,
        amount_total, amount_paid, currency, currency_code, payment_reference,
        status, payment_plan, deposit_amount, balance_amount, balance_due_at,
        installment_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        eventId,
        userId,
        buyerName,
        buyerEmail,
        buyerPhone,
        plan === "installment" ? depositAmount : amountTotal,
        currencyCode,
        currencyCode,
        orderRef,
        plan,
        depositAmount,
        balanceAmount,
        balanceDueAt,
        plan === "installment" ? "pending" : null,
      ]
    );
    const orderId = orderResult.insertId;

    // 9. Insert order items
    await connection.query(
      `INSERT INTO order_items
       (order_id, ticket_type_id, quantity, unit_price, holder_names)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, ticketTypeId, quantity, ticketType.price, JSON.stringify(validHolderNames)]
    );

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      orderId: orderId,
      amountTotal,
      amountDueNow: plan === "installment" ? depositAmount : amountTotal,
      balanceAmount,
      subtotal,
      feeAmount,
      feeBearer: event.fee_bearer,
      currency: currencyCode,
      paymentPlan: plan,
      event: {
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        venue_name: event.venue_name,
        timezone: event.timezone || "Africa/Lagos",
      },
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("❌ Error creating order:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create order",
    });
  }
});

/**
 * GET /api/orders/installments/pending – returns pending installments with payment_reference
 */
router.get("/installments/pending", requireAuth, async (req, res) => {
  const { user } = req;
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.payment_reference, o.amount_total, o.amount_paid, o.balance_amount, o.balance_due_at,
              e.title, e.slug, e.start_at
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.user_id = ?
         AND o.payment_plan = 'installment'
         AND o.installment_status = 'pending'
         AND o.status = 'partial'
       ORDER BY o.created_at DESC`,
      [user.id]
    );
    const formatted = rows.map((order) => ({
      id: order.id,
      payment_reference: order.payment_reference,
      event_title: order.title || "Untitled Event",
      event_slug: order.slug || "",
      amount_total: order.amount_total,
      amount_paid: order.amount_paid || order.amount_total * 0.5,
      balance_due: order.balance_amount || order.amount_total * 0.5,
      due_date: order.balance_due_at,
    }));
    res.json({ success: true, installments: formatted });
  } catch (err) {
    console.error("❌ Error fetching installments:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch installments" });
  }
});

/**
 * GET /api/orders/:orderRef – full order details
 */
router.get("/:orderRef", requireAuth, async (req, res) => {
  const { orderRef } = req.params;
  const userId = req.user.id;

  if (!orderRef) {
    return res.status(400).json({ success: false, message: "Missing order reference" });
  }

  try {
    const [orderRows] = await pool.query(
      `SELECT o.*,
              e.id as event_id,
              e.title as event_title,
              e.slug as event_slug,
              e.start_at as event_start_at,
              e.venue_name as event_venue_name,
              e.cover_image as event_cover_image,
              e.timezone as event_timezone
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.payment_reference = ? AND o.user_id = ?`,
      [orderRef, userId]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: `Order "${orderRef}" not found` });
    }
    const order = orderRows[0];

    const eventObj = {
      id: order.event_id,
      title: order.event_title,
      slug: order.event_slug,
      start_at: order.event_start_at,
      venue_name: order.event_venue_name,
      cover_image: order.event_cover_image,
      timezone: order.event_timezone,
    };
    delete order.event_id;
    delete order.event_title;
    delete order.event_slug;
    delete order.event_start_at;
    delete order.event_venue_name;
    delete order.event_cover_image;
    delete order.event_timezone;

    const [ticketRows] = await pool.query(
      `SELECT id, code, holder_name, checked_in, checked_in_at, transferred_at, transferred_to_name
       FROM tickets
       WHERE order_id = ?`,
      [order.id]
    );
    order.tickets = ticketRows;

    const [itemRows] = await pool.query(
      `SELECT id, ticket_type_id, quantity, unit_price, holder_names
       FROM order_items
       WHERE order_id = ?`,
      [order.id]
    );
    order.order_items = itemRows;
    order.events = eventObj;

    res.json({ success: true, order });
  } catch (err) {
    console.error("❌ Error fetching order:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch order" });
  }
});

/**
 * GET /api/orders/:orderRef/balance
 */
router.get("/:orderRef/balance", requireAuth, async (req, res) => {
  const { orderRef } = req.params;
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT o.*,
              e.currency, e.title, e.venue_name, e.start_at, e.timezone
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.payment_reference = ? AND o.user_id = ?`,
      [orderRef, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = rows[0];
    if (order.payment_plan !== "installment") {
      return res.status(400).json({ success: false, message: "This order isn't on an installment plan" });
    }
    if (order.status === "paid") {
      return res.status(400).json({ success: false, message: "This order is already fully paid" });
    }
    if (order.status !== "partial") {
      return res.status(400).json({ success: false, message: "The deposit hasn't been paid yet" });
    }
    const event = {
      currency: order.currency,
      title: order.title,
      venue_name: order.venue_name,
      start_at: order.start_at,
      timezone: order.timezone,
    };
    res.json({
      success: true,
      balanceAmount: order.balance_amount,
      currency: event.currency || order.currency_code,
      balanceDueAt: order.balance_due_at,
      event: event,
    });
  } catch (err) {
    console.error("❌ Error fetching balance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch balance" });
  }
});

export default router;