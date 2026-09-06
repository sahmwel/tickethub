// backend/lib/ticketService.js
import QRCode from "qrcode";
import crypto from "crypto";
import pool from "./db.js";
import { sendTicketConfirmation } from "./mailer.js";

export async function issueTicketsForOrder(order) {
  const eventId = order.event_id ?? order.events?.id;
  if (!eventId) {
    throw new Error("Order is missing an associated event; cannot issue tickets");
  }

  const orderItems = order.order_items ?? [];
  if (orderItems.length === 0) {
    throw new Error(`Order ${order.id} (${order.payment_reference}) has no order_items.`);
  }

  const ticketsToInsert = [];
  for (const item of orderItems) {
    const holderNames = Array.isArray(item.holder_names) ? item.holder_names : null;
    for (let i = 0; i < item.quantity; i++) {
      ticketsToInsert.push([
        crypto.randomUUID(),           // id
        order.id,                      // order_id
        item.ticket_type_id,           // ticket_type_id
        eventId,                       // event_id
        crypto.randomUUID(),           // code
        holderNames?.[i] || order.buyer_name,
        false,                         // checked_in
        null,                          // checked_in_at
        null,                          // transferred_at
        null,                          // transferred_to_name
      ]);
    }
  }

  if (ticketsToInsert.length === 0) {
    throw new Error(`Order ${order.id} has zero tickets to issue`);
  }

  // ✅ FIX: ticket insertion and the quantity_sold update now run inside a
  // single transaction. Previously these were two separate, unrelated
  // pool.query() calls — if the process crashed or the DB connection
  // dropped between them, tickets could exist in the `tickets` table
  // without quantity_sold ever being incremented, silently letting that
  // tier oversell later (since availability checks in orders.js rely on
  // quantity_sold being accurate). Wrapping both in a transaction means
  // they either both commit together or both roll back together.
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  let issuedTickets;
  try {
    const insertQuery = `
      INSERT INTO tickets
      (id, order_id, ticket_type_id, event_id, code, holder_name, checked_in, checked_in_at, transferred_at, transferred_to_name)
      VALUES ?
    `;
    await connection.query(insertQuery, [ticketsToInsert]);

    // Update quantity_sold for each ticket type, in the same transaction
    const ticketTypeCounts = {};
    for (const ticket of ticketsToInsert) {
      const ticketTypeId = ticket[2];
      if (!ticketTypeCounts[ticketTypeId]) ticketTypeCounts[ticketTypeId] = 0;
      ticketTypeCounts[ticketTypeId]++;
    }
    for (const [ticketTypeId, count] of Object.entries(ticketTypeCounts)) {
      await connection.query(
        `UPDATE ticket_types SET quantity_sold = quantity_sold + ? WHERE id = ?`,
        [count, ticketTypeId]
      );
    }

    const [rows] = await connection.query(`SELECT * FROM tickets WHERE order_id = ?`, [order.id]);
    issuedTickets = rows;

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // QR generation and email are intentionally outside the transaction —
  // a failed email shouldn't roll back already-committed ticket issuance
  // (the order is already paid; tickets legitimately exist regardless of
  // whether the confirmation email succeeds).
  const qrBuffers = await Promise.all(issuedTickets.map((t) => QRCode.toBuffer(t.code)));

  let emailSent = true;
  try {
    await sendTicketConfirmation({
      to: order.buyer_email,
      buyerName: order.buyer_name,
      eventTitle: order.events?.title ?? "your event",
      eventDate: order.events?.start_at ?? "",
      venue: order.events?.venue_name ?? "",
      timezone: order.events?.timezone || "Africa/Lagos",
      quantity: ticketsToInsert.length,
      reference: order.payment_reference,
      tickets: issuedTickets,
      qrBuffers,
    });
  } catch (emailErr) {
    console.error("⚠️ Ticket email failed:", emailErr);
    emailSent = false;
  }

  return { ticketsIssued: ticketsToInsert.length, emailSent, issuedTickets };
}