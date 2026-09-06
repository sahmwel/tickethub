// backend/routes/payments.js
import { Router } from "express";
import fetch from "node-fetch";
import QRCode from "qrcode";
import crypto from "crypto";
import axios from "axios"; // 👈 NEW: for forwarding
import pool from "../lib/db.js";
import { sendTicketConfirmation } from "../lib/mailer.js";
import { notifyWaitlistForTicketType } from "./waitlist.js";
import { requireAuth } from "../middleware/auth.js";
import { creditWallet } from "../lib/wallet.js";
import { issueTicketsForOrder } from "../lib/ticketService.js";

const router = Router();

// ============================================
// VERIFICATION FUNCTIONS
// ============================================
async function verifyPaystack(reference) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status || data.data?.status !== "success") {
    throw new Error(`Paystack verification failed: ${data.message}`);
  }
  return { amount: data.data.amount / 100, email: data.data.customer?.email, reference: data.data.reference, status: data.data.status, currency: data.data.currency };
}

async function verifyFlutterwave(reference) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const data = await res.json();
  if (data.status !== "success" || data.data?.status !== "successful") {
    throw new Error(`Flutterwave verification failed: ${data.message}`);
  }
  return { amount: data.data.amount, email: data.data.customer?.email, reference: data.data.tx_ref, status: data.data.status, currency: data.data.currency };
}

// ============================================
// SHARED ORDER FETCH
// ============================================
async function fetchOrderByReference({ provider, providerReference, orderRef }) {
  const referenceField = provider === "paystack" ? "paystack_reference" : "flutterwave_reference";

  let order = null;
  let foundBy = null;

  if (providerReference) {
    const [rows] = await pool.query(
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
       WHERE o.${referenceField} = ?`,
      [providerReference]
    );
    if (rows.length > 0) {
      order = rows[0];
      foundBy = "provider_reference";
    }
  }

  if (!order && orderRef) {
    const [rows] = await pool.query(
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
       WHERE o.payment_reference = ?`,
      [orderRef]
    );
    if (rows.length > 0) {
      order = rows[0];
      foundBy = "order_reference";
    }
  }

  if (!order) return { order: null, foundBy: null };

  const [itemRows] = await pool.query(
    `SELECT oi.*, tt.id as ticket_type_id, tt.name, tt.price
     FROM order_items oi
     LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
     WHERE oi.order_id = ?`,
    [order.id]
  );
  order.order_items = itemRows;

  const [ticketRows] = await pool.query(
    `SELECT t.*
     FROM tickets t
     WHERE t.order_id = ?`,
    [order.id]
  );
  order.tickets = ticketRows;

  if (order.event_id) {
    order.events = {
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
  }

  return { order, foundBy };
}

// ============================================
// SHARED FINALIZATION (MySQL)
// ============================================
async function finalizeVerifiedPayment({ order, provider, paymentAmount }) {
  if (order.status === "paid" && order.tickets && order.tickets.length > 0) {
    console.log(`ℹ️ Order ${order.id} already paid with ${order.tickets.length} ticket(s) — skipping re-issue`);
    return { success: true, alreadyProcessed: true, ticketsIssued: order.tickets.length };
  }

  const isInstallment = order.payment_plan === "installment";
  const payingBalance = isInstallment && order.status === "partial";

  if (payingBalance) {
    const now = new Date();
    const deadline = new Date(order.balance_due_at);
    if (now > deadline) {
      throw Object.assign(
        new Error("The deadline to pay the remaining balance (24 hours before the event) has passed."),
        { statusCode: 400 }
      );
    }
  }

  if (typeof paymentAmount === "number") {
    const roundedPaymentAmount = Math.round(paymentAmount);
    const expectedAmount = payingBalance ? Math.round(order.balance_amount) : Math.round(order.amount_total);
    if (expectedAmount !== roundedPaymentAmount) {
      throw Object.assign(
        new Error(`Amount mismatch: Expected ${order.currency_code || "NGN"} ${expectedAmount} vs Payment ${roundedPaymentAmount}`),
        { statusCode: 400 }
      );
    }
  }

  const newStatus = isInstallment && !payingBalance ? "partial" : "paid";

  await pool.query(
    `UPDATE orders
     SET status = ?,
         payment_provider = ?,
         paid_at = ?,
         balance_paid_at = ?
     WHERE id = ?`,
    [
      newStatus,
      provider,
      newStatus === "paid" ? new Date().toISOString() : null,
      payingBalance ? new Date().toISOString() : null,
      order.id,
    ]
  );

  console.log(`✅ Order ${order.id} marked as ${newStatus}`);

  if (newStatus === "partial") {
    return { success: true, depositPaid: true, balanceAmount: order.balance_amount, balanceDueAt: order.balance_due_at };
  }

  const { ticketsIssued, emailSent } = await issueTicketsForOrder(order);
  return { success: true, ticketsIssued, emailSent };
}

// ============================================
// WALLET FUNDING ENDPOINTS
// ============================================

router.get("/paystack-key", async (req, res) => {
  res.json({ publicKey: process.env.PAYSTACK_PUBLIC_KEY });
});

router.post("/flutterwave-init", async (req, res) => {
  const { amount, email, name, reference, type } = req.body;
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency: "NGN",
      redirect_url: `${process.env.CLIENT_ORIGIN}/wallet`,
      meta: { consumer_id: req.user?.id, type: type || "wallet_funding" },
      customer: { email, name: name || email },
      customizations: { title: "Fund Wallet", description: `Add ${amount} to wallet`, logo: "https://your-site.com/logo.png" },
    }),
  });
  const data = await response.json();
  if (data.status === "success") {
    res.json({
      tx_ref: data.data.tx_ref,
      amount: data.data.amount,
      currency: data.data.currency,
      public_key: process.env.FLUTTERWAVE_PUBLIC_KEY,
      redirect_url: data.data.redirect_url,
    });
  } else {
    throw new Error(data.message || "Failed to initialize payment");
  }
});

router.post("/verify-funding", requireAuth, async (req, res) => {
  const { reference, provider, provider_reference } = req.body;
  const userId = req.user.id;

  let verified = false;
  let amount = 0, currency = "NGN";

  if (provider === "paystack") {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${provider_reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();
    if (data.status && data.data.status === "success") {
      verified = true;
      amount = data.data.amount / 100;
      currency = data.data.currency || "NGN";
    }
  } else if (provider === "flutterwave") {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${provider_reference}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });
    const data = await response.json();
    if (data.status === "success" && data.data.status === "successful") {
      verified = true;
      amount = data.data.amount;
      currency = data.data.currency || "NGN";
    }
  }

  if (!verified) {
    return res.status(400).json({ success: false, message: "Payment verification failed. Please contact support." });
  }

  const [existingTx] = await pool.query(
    `SELECT id FROM wallet_transactions WHERE reference = ? AND type = 'credit'`,
    [provider_reference]
  );
  if (existingTx.length > 0) {
    return res.json({ success: true, alreadyProcessed: true, message: "This transaction has already been processed" });
  }

  const result = await creditWallet(
    userId,
    amount,
    provider_reference,
    `Wallet funding via ${provider}`,
    { payment_provider: provider, original_reference: reference, currency }
  );

  res.json({ success: true, balance: result.wallet.balance, amount, currency, transaction: result.transaction });
});

// ============================================
// UPDATE ORDER WITH PROVIDER REFERENCE
// ============================================
router.post("/update-payment-ref", async (req, res) => {
  const { orderRef, provider, providerReference } = req.body;
  if (!orderRef || !provider || !providerReference) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  try {
    const updateField = provider === "paystack" ? "paystack_reference" : "flutterwave_reference";
    const [result] = await pool.query(
      `UPDATE orders SET ${updateField} = ?, payment_provider = ?, updated_at = NOW() WHERE payment_reference = ?`,
      [providerReference, provider, orderRef]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Order with reference "${orderRef}" not found` });
    }
    res.json({ success: true, message: `Order updated with ${provider} reference` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to update order" });
  }
});

// ============================================
// GET ORGANIZER SUBACCOUNT INFO
// ============================================
router.get("/subaccount-for-order/:orderRef", async (req, res) => {
  const { orderRef } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT o.event_id,
              e.organizer_id, e.fee_bearer, e.currency,
              e.paystack_subaccount_override, e.flutterwave_subaccount_override,
              p.paystack_subaccount_code, p.flutterwave_subaccount_id
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       LEFT JOIN profiles p ON e.organizer_id = p.id
       WHERE o.payment_reference = ?`,
      [orderRef]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const row = rows[0];
    res.json({
      success: true,
      paystackSubaccountCode: row.paystack_subaccount_override || row.paystack_subaccount_code || null,
      flutterwaveSubaccountId: row.flutterwave_subaccount_override || row.flutterwave_subaccount_id || null,
      feeBearer: row.fee_bearer || "attendee",
      currency: row.currency || "NGN",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to fetch subaccount info" });
  }
});

// ============================================
// PAYOUT SETTINGS ROUTES (using pool)
// ============================================
router.get("/banks", requireAuth, async (req, res) => {
  res.json({ success: true, banks: [] });
});

router.post("/verify-account", requireAuth, async (req, res) => {
  res.json({ success: true });
});

router.post("/connect-payout", requireAuth, async (req, res) => {
  res.json({ success: true });
});

router.get("/payout-account", requireAuth, async (req, res) => {
  res.json({ success: true, account: null });
});

router.post("/disconnect-payout", requireAuth, async (req, res) => {
  res.json({ success: true });
});

router.get("/payout-history", requireAuth, async (req, res) => {
  res.json({ success: true, payouts: [] });
});

// ============================================
// MAIN VERIFY ENDPOINT
// ============================================
router.post("/verify", async (req, res) => {
  const { provider, reference, orderRef, eventId } = req.body;
  if (!provider || !reference || !orderRef || !eventId) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }
  try {
    const verified = provider === "paystack" ? await verifyPaystack(reference) : await verifyFlutterwave(reference);
    const { order, foundBy } = await fetchOrderByReference({ provider, providerReference: reference, orderRef });
    if (!order) {
      return res.status(404).json({ success: false, message: `Order not found. OrderRef: ${orderRef}, ProviderRef: ${reference}` });
    }
    const result = await finalizeVerifiedPayment({ order, provider, paymentAmount: verified.amount });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Verification failed" });
  }
});

// ============================================
// WEBHOOKS – UPDATED WITH FORWARDING
// ============================================
router.post("/webhook/paystack", async (req, res) => {
  // 1. Verify signature
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
                     .update(req.rawBody).digest("hex");
  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  // ─── FORWARD VOTE / SHOP EVENTS TO MISS NAIJA ───
  if (req.body.event === "charge.success") {
    const eventData = req.body.data;
    const metadata = eventData.metadata || {};
    const purpose = metadata.purpose;

    if (purpose === "vote" || purpose === "shop_order" || purpose === "shop") {
      try {
        await axios.post(
          process.env.MISS_NAIJA_WEBHOOK_URL || "https://www.missnaija.com/api/internal/vote-webhook",
          eventData,
          {
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Token": process.env.INTERNAL_WEBHOOK_TOKEN,
            },
            timeout: 5000,
          }
        );
        console.log(`✅ Forwarded ${purpose} event ${eventData.reference} to Miss Naija`);
      } catch (error) {
        console.error(`❌ Failed to forward ${purpose} event:`, error.message);
        // Do NOT throw – we still want to return 200 to Paystack
      }
    }
  }

  // ─── PROCESS TICKETING ORDERS (unchanged) ───
  if (req.body.event === "charge.success") {
    const { reference, amount } = req.body.data;
    await handleSuccessfulPayment({
      providerReference: reference,
      provider: "paystack",
      paymentAmount: amount / 100,
    });
  }

  res.sendStatus(200);
});

router.post("/webhook/flutterwave", async (req, res) => {
  if (req.headers["verif-hash"] !== process.env.FLUTTERWAVE_SECRET_HASH) {
    return res.status(401).send("Invalid signature");
  }
  if (req.body.status === "successful") {
    const reference = req.body.txRef || req.body.tx_ref;
    await handleSuccessfulPayment({ providerReference: reference, provider: "flutterwave", paymentAmount: req.body.amount });
  }
  res.sendStatus(200);
});

async function handleSuccessfulPayment({ providerReference, provider, paymentAmount }) {
  try {
    const { order, foundBy } = await fetchOrderByReference({ provider, providerReference });
    if (!order) {
      console.error(`❌ Order not found for ${provider} reference:`, providerReference);
      return;
    }
    const result = await finalizeVerifiedPayment({ order, provider, paymentAmount });
    console.log(`✅ Webhook: order ${order.id} processed`);
  } catch (error) {
    console.error(`❌ Webhook error:`, error);
  }
}

router.post("/notify-waitlist/:ticketTypeId", async (req, res) => {
  await notifyWaitlistForTicketType(req.params.ticketTypeId);
  res.json({ success: true });
});

export default router;