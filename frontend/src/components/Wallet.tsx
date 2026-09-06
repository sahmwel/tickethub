import { useState } from "react";
import { formatMoney } from "../lib/constants";

// Add this to your Wallet component
const [pendingInstallments, setPendingInstallments] = useState([]);

// Add this function to handle manual installment failure
const handleFailedInstallment = async (orderId: string) => {
  if (!confirm("Are you sure you want to cancel this installment? The amount paid will be refunded to your wallet.")) {
    return;
  }

  try {
    const result = await apiPost(`/api/installment/${orderId}/fail`, {});
    if (result.success) {
      alert(`✅ Refunded ${formatMoney(result.refundAmount, "NGN")} to your wallet`);
      await fetchWalletData();
    } else {
      alert(`❌ ${result.message}`);
    }
  } catch (err) {
    alert("Failed to process refund");
  }
};

function apiPost(
  arg0: string,
  arg1: {}
): Promise<{ success: boolean; refundAmount: number; message: string }> {
    throw new Error("Function not implemented.");
}
function fetchWalletData() {
    throw new Error("Function not implemented.");
}