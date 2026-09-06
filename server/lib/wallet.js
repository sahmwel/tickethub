// backend/lib/wallet.js
import pool from "./db.js";

/**
 * Get or create wallet for a user
 */
export async function getOrCreateWallet(userId) {
  // Try to find existing wallet
  const [rows] = await pool.query(
    `SELECT * FROM wallets WHERE user_id = ?`,
    [userId]
  );
  if (rows.length > 0) {
    return rows[0];
  }

  // Create new wallet
  const [result] = await pool.query(
    `INSERT INTO wallets (user_id, balance, currency, created_at, updated_at)
     VALUES (?, 0, 'NGN', NOW(), NOW())`,
    [userId]
  );
  // Fetch the newly created wallet
  const [newRows] = await pool.query(
    `SELECT * FROM wallets WHERE id = ?`,
    [result.insertId]
  );
  return newRows[0];
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(userId) {
  const wallet = await getOrCreateWallet(userId);
  return parseFloat(wallet.balance);
}

/**
 * Add credit to wallet
 */
export async function creditWallet(userId, amount, reference, description, metadata = {}) {
  const wallet = await getOrCreateWallet(userId);

  // Insert transaction
  const [txResult] = await pool.query(
    `INSERT INTO wallet_transactions
     (wallet_id, amount, type, reference, description, status, metadata, created_at)
     VALUES (?, ?, 'credit', ?, ?, 'completed', ?, NOW())`,
    [wallet.id, amount, reference, description, JSON.stringify(metadata)]
  );

  // Update wallet balance
  const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
  await pool.query(
    `UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?`,
    [newBalance, wallet.id]
  );

  // Fetch updated wallet
  const [updatedRows] = await pool.query(
    `SELECT * FROM wallets WHERE id = ?`,
    [wallet.id]
  );
  const updatedWallet = updatedRows[0];

  // Fetch the transaction
  const [txRows] = await pool.query(
    `SELECT * FROM wallet_transactions WHERE id = ?`,
    [txResult.insertId]
  );
  const transaction = txRows[0];

  return { transaction, wallet: updatedWallet };
}

/**
 * Debit from wallet
 */
export async function debitWallet(userId, amount, reference, description, metadata = {}) {
  const wallet = await getOrCreateWallet(userId);

  if (parseFloat(wallet.balance) < parseFloat(amount)) {
    throw new Error("Insufficient wallet balance");
  }

  // Insert transaction
  const [txResult] = await pool.query(
    `INSERT INTO wallet_transactions
     (wallet_id, amount, type, reference, description, status, metadata, created_at)
     VALUES (?, ?, 'debit', ?, ?, 'completed', ?, NOW())`,
    [wallet.id, amount, reference, description, JSON.stringify(metadata)]
  );

  // Update wallet balance
  const newBalance = parseFloat(wallet.balance) - parseFloat(amount);
  await pool.query(
    `UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?`,
    [newBalance, wallet.id]
  );

  // Fetch updated wallet
  const [updatedRows] = await pool.query(
    `SELECT * FROM wallets WHERE id = ?`,
    [wallet.id]
  );
  const updatedWallet = updatedRows[0];

  // Fetch the transaction
  const [txRows] = await pool.query(
    `SELECT * FROM wallet_transactions WHERE id = ?`,
    [txResult.insertId]
  );
  const transaction = txRows[0];

  return { transaction, wallet: updatedWallet };
}

/**
 * Refund to wallet (for failed installment payments)
 */
export async function refundToWallet(userId, amount, reference, description, metadata = {}) {
  const wallet = await getOrCreateWallet(userId);

  // Insert transaction (type = 'refund')
  const [txResult] = await pool.query(
    `INSERT INTO wallet_transactions
     (wallet_id, amount, type, reference, description, status, metadata, created_at)
     VALUES (?, ?, 'refund', ?, ?, 'completed', ?, NOW())`,
    [wallet.id, amount, reference, description, JSON.stringify(metadata)]
  );

  // Update wallet balance
  const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
  await pool.query(
    `UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?`,
    [newBalance, wallet.id]
  );

  // Fetch updated wallet
  const [updatedRows] = await pool.query(
    `SELECT * FROM wallets WHERE id = ?`,
    [wallet.id]
  );
  const updatedWallet = updatedRows[0];

  // Fetch the transaction
  const [txRows] = await pool.query(
    `SELECT * FROM wallet_transactions WHERE id = ?`,
    [txResult.insertId]
  );
  const transaction = txRows[0];

  return { transaction, wallet: updatedWallet };
}

/**
 * Get wallet transactions with pagination
 */
export async function getWalletTransactions(userId, limit = 50, offset = 0) {
  const wallet = await getOrCreateWallet(userId);

  // Get transactions
  const [rows] = await pool.query(
    `SELECT * FROM wallet_transactions
     WHERE wallet_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [wallet.id, limit, offset]
  );

  // Get total count
  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM wallet_transactions WHERE wallet_id = ?`,
    [wallet.id]
  );
  const total = countRows[0].total;

  return { transactions: rows, total };
}

/**
 * Process failed installment - refund to wallet and cancel order
 */
export async function processFailedInstallment(orderId) {
  try {
    // Get order with event info
    const [orderRows] = await pool.query(
      `SELECT o.*, e.title as event_title
       FROM orders o
       LEFT JOIN events e ON o.event_id = e.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error("Order not found");
    }
    const order = orderRows[0];

    // Check if order is in installment and not already refunded
    if (order.installment_status !== "pending" && order.installment_status !== "failed") {
      return { success: false, message: "Order is not pending installment" };
    }

    // Determine user ID: we need the profile ID from the buyer_email
    const [profileRows] = await pool.query(
      `SELECT id FROM profiles WHERE email = ?`,
      [order.buyer_email]
    );
    if (profileRows.length === 0) {
      throw new Error("User profile not found for buyer email");
    }
    const userId = profileRows[0].id;

    // Calculate refund amount (the paid amount)
    const refundAmount = order.amount_paid || order.deposit_amount || parseFloat(order.total_amount) * 0.5;

    // Refund to wallet
    const result = await refundToWallet(
      userId,
      refundAmount,
      `REFUND-INSTALLMENT-${orderId}-${Date.now()}`,
      `Refund for failed installment payment - Order ${order.payment_reference || orderId}`,
      { orderId, eventTitle: order.event_title || "Event" }
    );

    // Update order status
    await pool.query(
      `UPDATE orders
       SET installment_status = 'refunded',
           status = 'refunded',
           refunded_at = NOW()
       WHERE id = ?`,
      [orderId]
    );

    // Cancel associated tickets
    await pool.query(
      `UPDATE tickets
       SET status = 'refunded', refunded_at = NOW()
       WHERE order_id = ?`,
      [orderId]
    );

    return {
      success: true,
      refundAmount,
      walletBalance: result.wallet.balance,
      message: `Refunded ${refundAmount} to wallet for failed installment`,
    };
  } catch (err) {
    console.error("Failed to process installment refund:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Check for expired installment orders (balance deadline passed)
 * Refund only if 48 hours have passed after event end.
 * This should be run as a scheduled job.
 */
export async function checkExpiredInstallments() {
  try {
    const now = new Date();

    // Get orders with pending installments where balance_due_at has passed (deadline)
    const [orders] = await pool.query(
      `SELECT o.*, e.id as event_id, e.end_at, e.start_at
       FROM orders o
       JOIN events e ON o.event_id = e.id
       WHERE o.installment_status = 'pending'
         AND o.status = 'partial'
         AND o.payment_plan = 'installment'
         AND o.balance_due_at < NOW()`
    );

    const results = [];
    for (const order of orders) {
      // Determine event end time (end_at or fallback to start_at)
      const eventEnd = order.end_at ? new Date(order.end_at) : new Date(order.start_at);
      const refundTime = new Date(eventEnd.getTime() + 48 * 60 * 60 * 1000); // 48h after event ends

      // Only process refund if 48h have passed since event ended
      if (now < refundTime) {
        console.log(`⏳ Order ${order.id} will be refunded after ${refundTime.toISOString()}`);
        continue;
      }

      // Get user ID from buyer_email
      const [profileRows] = await pool.query(
        `SELECT id FROM profiles WHERE email = ?`,
        [order.buyer_email]
      );
      if (profileRows.length === 0) {
        console.warn(`❌ No profile found for buyer_email: ${order.buyer_email}`);
        continue;
      }
      const userId = profileRows[0].id;

      const depositAmount = order.deposit_amount || parseFloat(order.total_amount) * 0.5;
      const result = await refundToWallet(
        userId,
        depositAmount,
        `REFUND-INSTALLMENT-${order.id}-${Date.now()}`,
        `Refund for failed installment - Order ${order.payment_reference || order.id}`,
        { orderId: order.id, eventTitle: order.event_title }
      );

      // Update order status
      await pool.query(
        `UPDATE orders
         SET installment_status = 'refunded',
             status = 'refunded',
             refunded_at = NOW()
         WHERE id = ?`,
        [order.id]
      );

      // Cancel associated tickets
      await pool.query(
        `UPDATE tickets
         SET status = 'refunded', refunded_at = NOW()
         WHERE order_id = ?`,
        [order.id]
      );

      results.push({ orderId: order.id, refundAmount: depositAmount });
      console.log(`✅ Refunded deposit for order ${order.id}`);
    }

    return { success: true, processed: results.length, results };
  } catch (err) {
    console.error("Error checking expired installments:", err);
    return { success: false, message: err.message };
  }
}

export default {
  getOrCreateWallet,
  getWalletBalance,
  creditWallet,
  debitWallet,
  refundToWallet,
  getWalletTransactions,
  processFailedInstallment,
  checkExpiredInstallments,
};