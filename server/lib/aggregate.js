// backend/lib/aggregate.js
import pool from "../lib/db.js";

/**
 * Fetch events with their ticket_types aggregated in Node.js.
 * @param {string} sql - The SQL query to fetch events (must include all columns)
 * @param {Array} params - Parameters for the SQL query
 * @returns {Promise<Array>} - Array of events with a `ticket_types` array
 */
export async function fetchEventsWithTicketTypes(sql, params) {
  const [eventRows] = await pool.query(sql, params);
  if (eventRows.length === 0) return [];

  const eventIds = eventRows.map((e) => e.id);
  if (eventIds.length === 0) return eventRows;

  const placeholders = eventIds.map(() => '?').join(',');
  const [ticketRows] = await pool.query(
    `SELECT 
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
     WHERE event_id IN (${placeholders})`,
    eventIds
  );

  const ticketsByEvent = {};
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

  return eventRows.map((e) => ({
    ...e,
    ticket_types: ticketsByEvent[e.id] || [],
  }));
}

/**
 * Generic aggregator for any parent-child relation.
 * @param {Array} parentRows - Parent rows (must have `id`)
 * @param {Array} childRows - Child rows (must have a foreign key field)
 * @param {string} parentKey - The field in child rows that references parent id
 * @param {string} childKey - The name of the array to attach to parents
 * @param {Array} childFields - Array of field names to include in each child object
 * @returns {Array} - Parent rows with `childKey` attached
 */
export function aggregateRelation(parentRows, childRows, parentKey, childKey, childFields) {
  const childrenByParent = {};
  for (const child of childRows) {
    const parentId = child[parentKey];
    if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
    const obj = {};
    for (const field of childFields) {
      obj[field] = child[field];
    }
    childrenByParent[parentId].push(obj);
  }
  return parentRows.map((parent) => ({
    ...parent,
    [childKey]: childrenByParent[parent.id] || [],
  }));
}