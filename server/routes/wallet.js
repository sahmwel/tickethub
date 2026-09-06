// backend/routes/wallet.js
import { Router } from "express";
import pool from "../lib/db.js";
import {
  getOrCreateWallet,
  getWalletBalance,
  creditWallet,
  debitWallet,
  refundToWallet,
  getWalletTransactions,
  processFailedInstallment,
  checkExpiredInstallments,
} from "../lib/wallet.js";
import {
  sendWalletCreditEmail,
  sendWalletDebitEmail,
} from "../lib/mailer.js";
import { issueTicketsForOrder } from "../lib/ticketService.js";

const router = Router();

// ============================================
// GET WALLET BALANCE
// ============================================
router.get("/balance", async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userProfile = req.profile;

    const balance = await getWalletBalance(userId);
    res.json({
      success: true,
      balance,
      user: {
        id: userId,
        email: userEmail,
        full_name: userProfile.full_name,
        role: userProfile.role,
      },
    });
  } catch (err) {
    console.error("❌ Error getting wallet balance:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get wallet balance",
    });
  }
});

// ============================================
// GET WALLET TRANSACTIONS
// ============================================
router.get("/transactions", async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    const result = await getWalletTransactions(userId, parseInt(limit), parseInt(offset));
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("❌ Error getting transactions:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get transactions",
    });
  }
});

// ============================================
// FUND WALLET VIA PAYMENT
// ============================================
router.post("/fund", async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = req.profile;
    const { amount, paymentReference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const result = await creditWallet(
      userId,
      amount,
      paymentReference || `FUND-${Date.now()}`,
      `Wallet funding via ${paymentReference ? "payment" : "manual"}`,
      { source: "payment", paymentReference }
    );

    try {
      await sendWalletCreditEmail({
        to: req.user.email,
        name: userProfile.full_name || "User",
        amount: amount,
        description: "Wallet funding",
        balance: result.wallet.balance,
      });
    } catch (emailErr) {
      console.warn("⚠️ Failed to send wallet credit email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Wallet funded successfully",
      balance: result.wallet.balance,
      transaction: result.transaction,
    });
  } catch (err) {
    console.error("❌ Error funding wallet:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fund wallet",
    });
  }
});

// ============================================
// CHECK IF WALLET CAN COVER AMOUNT
// ============================================
router.post("/check", async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    const balance = await getWalletBalance(userId);
    const canCover = balance >= amount;
    res.json({
      success: true,
      balance,
      canCover,
      shortfall: canCover ? 0 : amount - balance,
    });
  } catch (err) {
    console.error("❌ Error checking wallet:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to check wallet",
    });
  }
});

// ============================================
// PAY WITH WALLET – FIXED status logic
// ============================================
router.post("/pay", async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = req.profile;
    const { amount, orderRef, orderId, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Query full order details, including payment_plan
    let orderQuery = `SELECT o.*, e.id as event_id, e.title, e.start_at, e.venue_name, e.timezone
                      FROM orders o
                      LEFT JOIN events e ON o.event_id = e.id
                      WHERE o.buyer_email = ?`;
    let queryParams = [req.user.email];

    if (orderRef) {
      orderQuery += ` AND o.payment_reference = ?`;
      queryParams.push(orderRef);
      console.log(`🔍 Looking up order by payment_reference: ${orderRef}`);
    } else if (orderId) {
      orderQuery += ` AND o.id = ?`;
      queryParams.push(orderId);
      console.log(`🔍 Looking up order by id: ${orderId}`);
    } else {
      return res.status(400).json({
        success: false,
        message: "Order reference (orderRef) or ID (orderId) required",
      });
    }

    const [orderRows] = await pool.query(orderQuery, queryParams);
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderRows[0];

    // Only pending and partial orders can be paid with wallet
    if (order.status !== "pending" && order.status !== "partial") {
      return res.status(400).json({
        success: false,
        message: `Order status (${order.status}) cannot be paid with wallet`,
      });
    }

    // Debit wallet
    const result = await debitWallet(
      userId,
      amount,
      `ORDER-${order.id}-${Date.now()}`,
      description || `Payment for order ${order.id}`,
      { orderId: order.id }
    );

    // ---- Determine new status ----
    let newStatus;
    let installmentStatus = null;
    const isInstallment = order.payment_plan === "installment";

    if (order.status === "pending" && isInstallment) {
      // First installment (deposit)
      newStatus = "partial";
      installmentStatus = "pending";
    } else if (order.status === "partial" && isInstallment) {
      // Balance payment
      newStatus = "paid";
      installmentStatus = "paid";
    } else {
      // Full payment for non-installment orders (or if somehow a non-installment order is partial)
      // Actually if not installment, 'partial' should not exist, but we handle anyway.
      newStatus = "paid";
      installmentStatus = null;
    }

    // Update order
    await pool.query(
      `UPDATE orders 
       SET wallet_amount = ?, 
           wallet_payment_id = ?, 
           status = ?,
           installment_status = ?,
           paid_at = ?,
           balance_paid_at = ?
       WHERE id = ?`,
      [
        amount,
        result.transaction.id,
        newStatus,
        installmentStatus,
        newStatus === "paid" ? new Date().toISOString() : null,
        newStatus === "paid" ? new Date().toISOString() : null,
        order.id,
      ]
    );

    // ---- If order becomes fully paid, issue tickets ----
    if (newStatus === "paid") {
      // Fetch order_items and event info
      const [items] = await pool.query(
        `SELECT oi.*, tt.id as ticket_type_id, tt.name, tt.price
         FROM order_items oi
         LEFT JOIN ticket_types tt ON oi.ticket_type_id = tt.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.order_items = items;
      order.events = {
        id: order.event_id,
        title: order.title,
        start_at: order.start_at,
        venue_name: order.venue_name,
        timezone: order.timezone,
      };

      try {
        const ticketResult = await issueTicketsForOrder(order);
        console.log(`🎫 Tickets issued: ${ticketResult.ticketsIssued}`);
      } catch (ticketErr) {
        console.error("❌ Failed to issue tickets after wallet payment:", ticketErr);
        // We don't throw to avoid failing the whole request; tickets can be retried manually.
      }
    }

    // Send email notification
    try {
      await sendWalletDebitEmail({
        to: req.user.email,
        name: userProfile.full_name || "User",
        amount: amount,
        description: description || `Payment for order ${order.id}`,
        balance: result.wallet.balance,
      });
    } catch (emailErr) {
      console.warn("⚠️ Failed to send wallet debit email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Payment successful",
      balance: result.wallet.balance,
      transaction: result.transaction,
      orderRef: order.payment_reference,
      status: newStatus, // useful for the frontend to know the new order status
    });
  } catch (err) {
    console.error("❌ Error processing wallet payment:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process payment",
    });
  }
});

// ============================================
// HANDLE FAILED INSTALLMENT - REFUND TO WALLET
// ============================================
router.post("/installment/refund", async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = req.profile;
    const { orderId, amount, description } = req.body;

    const [orderRows] = await pool.query(
      `SELECT * FROM orders WHERE id = ? AND buyer_email = ?`,
      [orderId, req.user.email]
    );
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orderRows[0];

    const result = await refundToWallet(
      userId,
      amount || order.amount_paid || order.total_amount * 0.5,
      `REFUND-${orderId}-${Date.now()}`,
      description || `Refund for failed installment - Order ${orderId}`,
      { orderId }
    );

    await pool.query(
      `UPDATE orders 
       SET installment_status = 'refunded', 
           status = 'refunded', 
           refunded_at = NOW() 
       WHERE id = ?`,
      [orderId]
    );

    try {
      await sendWalletCreditEmail({
        to: req.user.email,
        name: userProfile.full_name || "User",
        amount: amount || order.total_amount,
        description: description || `Refund for failed installment - Order ${orderId}`,
        balance: result.wallet.balance,
      });
    } catch (emailErr) {
      console.warn("⚠️ Failed to send refund email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Refunded to wallet successfully",
      balance: result.wallet.balance,
      transaction: result.transaction,
    });
  } catch (err) {
    console.error("❌ Error processing installment refund:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process refund",
    });
  }
});

// ============================================
// PROCESS FAILED INSTALLMENT (Admin only)
// ============================================
router.post("/installment/process/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await processFailedInstallment(orderId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("❌ Error processing installment:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process installment",
    });
  }
});

// ============================================
// CHECK EXPIRED INSTALLMENTS (Admin only)
// ============================================
router.post("/installment/check-expired", async (req, res) => {
  try {
    const result = await checkExpiredInstallments();
    res.json(result);
  } catch (err) {
    console.error("❌ Error checking expired installments:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to check expired installments",
    });
  }
});

// ============================================
// GET WALLET SUMMARY (Admin only)
// ============================================
router.get("/admin/summary", async (req, res) => {
  try {
    const [walletRows] = await pool.query(`SELECT balance FROM wallets`);
    const totalWallets = walletRows.length;
    const totalBalance = walletRows.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0);
    const [txRows] = await pool.query(
      `SELECT type, amount 
       FROM wallet_transactions 
       WHERE created_at >= CURDATE()`
    );
    const todayCredits = txRows
      .filter((t) => t.type === "credit" || t.type === "refund")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const todayDebits = txRows
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    res.json({
      success: true,
      summary: {
        totalWallets,
        totalBalance,
        todayCredits,
        todayDebits,
        netToday: todayCredits - todayDebits,
      },
    });
  } catch (err) {
    console.error("❌ Error getting wallet summary:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get wallet summary",
    });
  }
});

export default router;