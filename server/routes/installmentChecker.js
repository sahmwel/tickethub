// backend/jobs/installmentChecker.js
import { checkExpiredInstallments } from "../lib/wallet.js";
import { sendInstallmentFailedEmail } from "../lib/mailer.js";
import pool from "../lib/db.js";

export async function runInstallmentChecker() {
  console.log("🔍 Running installment checker...");
  try {
    const result = await checkExpiredInstallments();
    if (result.success && result.processed > 0) {
      console.log(`✅ Processed ${result.processed} expired installments`);
      for (const item of result.results) {
        // Get order details for email
        const [orderRows] = await pool.query(
          `SELECT buyer_email, buyer_name FROM orders WHERE id = ?`,
          [item.orderId]
        );
        if (orderRows.length > 0) {
          const order = orderRows[0];
          await sendInstallmentFailedEmail({
            to: order.buyer_email,
            name: order.buyer_name,
            eventTitle: item.eventTitle,
            refundAmount: item.refundAmount,
            orderId: item.orderId,
          });
        }
      }
    }
    return result;
  } catch (err) {
    console.error("❌ Installment checker failed:", err);
    return { success: false, message: err.message };
  }
}