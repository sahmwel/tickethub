// frontend/src/pages/Installments.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../lib/apiClient";
import { formatMoney } from "../lib/constants";

interface InstallmentOrder {
  id: string;
  payment_reference: string;   // ✅ the string identifier for the order
  event_title: string;
  event_slug: string;
  amount_total: number;
  amount_paid: number;
  balance_due: number;
  due_date: string;
}

export default function Installments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [installments, setInstallments] = useState<InstallmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);
    apiGet<{
        message: string; success: boolean; installments: InstallmentOrder[] 
}>("/api/orders/installments/pending")
      .then((data) => {
        if (data.success) {
          setInstallments(data.installments || []);
        } else {
          setError(data.message || "Failed to load installments");
        }
      })
      .catch((err) => {
        console.error("Error loading installments:", err);
        setError(err.message || "Failed to load installments");
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading your installments…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl mb-4">Log in to see your installments</h1>
        <Link to="/login" className="text-gold font-semibold">
          Log in →
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-4">Something went wrong</h1>
        <p className="text-smoke mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-gold font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  if (installments.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl mb-4">No pending installments</h1>
        <p className="text-smoke mb-6">You don't have any installment payments due.</p>
        <Link to="/events" className="text-gold font-semibold">
          Browse events →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
      <h1 className="font-display text-4xl tracking-wide mb-2">My Installments</h1>
      <p className="text-smoke text-sm mb-8">Pay the remaining balance for your bookings.</p>

      <div className="space-y-4">
        {installments.map((item) => {
          const dueDate = item.due_date ? new Date(item.due_date) : null;
          const isOverdue = dueDate && dueDate < new Date();

          return (
            <div
              key={item.id}
              className="bg-panel border border-line rounded-2xl p-6 hover:border-gold/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-bone">{item.event_title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-smoke mt-1">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Total: {formatMoney(item.amount_total, "NGN")}
                    </span>
                    <span className="flex items-center gap-1 text-gold">
                      <span className="font-semibold">Paid: {formatMoney(item.amount_paid, "NGN")}</span>
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <span className="font-semibold">Remaining: {formatMoney(item.balance_due, "NGN")}</span>
                    </span>
                  </div>
                  {dueDate && (
                    <p className={`text-xs mt-2 ${isOverdue ? "text-red-400" : "text-smoke/70"}`}>
                      {isOverdue ? "⚠️" : "📅"} Due by: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isOverdue && <span className="ml-2 text-red-400 font-semibold">(OVERDUE)</span>}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      navigate(`/checkout/${item.event_slug}`, {
                        state: {
                          isBalancePayment: true,
                          orderRef: item.payment_reference,   // ✅ correct payment_reference (string)
                          amountDueNow: item.balance_due,
                          eventId: null, // will be fetched from slug anyway
                        },
                      });
                    }}
                    className="bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-2 rounded-xl transition-colors text-sm"
                  >
                    Pay remaining
                  </button>
                  <Link
                    to={`/events/${item.event_slug}`}
                    className="border border-line hover:border-gold/40 text-smoke hover:text-bone px-6 py-2 rounded-xl transition-colors text-center text-sm"
                  >
                    View event
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}